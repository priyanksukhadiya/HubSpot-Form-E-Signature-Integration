<?php
/**
 * HubSpot E-Signature Integration - WordPress Handler
 * 
 * Complete server-side solution for handling signature uploads and HubSpot integration
 * Designed for WordPress but adaptable to any PHP environment
 * 
 * @version 2.0.0
 * @author HubSpot E-Signature Integration
 * @license MIT
 */

// =============================================
// SIGNATURE UPLOAD HANDLER
// =============================================

/**
 * Handle signature image upload via AJAX
 */
add_action('wp_ajax_upload_signature_image', 'hubspot_signature_upload_handler');
add_action('wp_ajax_nopriv_upload_signature_image', 'hubspot_signature_upload_handler');

function hubspot_signature_upload_handler() {
    // Security check
    if (!wp_verify_nonce($_POST['nonce'] ?? '', 'signature_upload_nonce')) {
        // For development, allow without nonce. In production, uncomment below:
        // wp_send_json_error(['message' => 'Security check failed']);
        // return;
    }
    
    // Validate input
    if (!isset($_POST['signature_base64']) || empty($_POST['signature_base64'])) {
        wp_send_json_error(['message' => 'No signature data provided']);
        return;
    }
    
    try {
        $base64_data = $_POST['signature_base64'];
        
        // Parse base64 data
        if (!preg_match('/^data:image\/(\w+);base64,(.+)$/', $base64_data, $matches)) {
            throw new Exception('Invalid base64 image format');
        }
        
        $image_type = strtolower($matches[1]);
        $base64_string = $matches[2];
        
        // Validate image type
        $allowed_types = ['png', 'jpg', 'jpeg', 'gif'];
        if (!in_array($image_type, $allowed_types)) {
            throw new Exception('Invalid image type. Allowed: ' . implode(', ', $allowed_types));
        }
        
        // Decode base64
        $image_data = base64_decode($base64_string);
        if ($image_data === false) {
            throw new Exception('Failed to decode base64 data');
        }
        
        // Validate file size (max 5MB)
        if (strlen($image_data) > 5 * 1024 * 1024) {
            throw new Exception('Signature file too large (max 5MB)');
        }
        
        // Create signatures directory
        $upload_dir = wp_upload_dir();
        $signature_dir = $upload_dir['basedir'] . '/hubspot-signatures';
        
        if (!file_exists($signature_dir)) {
            if (!wp_mkdir_p($signature_dir)) {
                throw new Exception('Failed to create signatures directory');
            }
            
            // Create .htaccess for security
            file_put_contents($signature_dir . '/.htaccess', "deny from all");
        }
        
        // Generate secure filename
        $timestamp = time();
        $random = wp_generate_password(12, false);
        $filename = "signature_{$timestamp}_{$random}.{$image_type}";
        $file_path = $signature_dir . '/' . $filename;
        
        // Save image
        if (!file_put_contents($file_path, $image_data)) {
            throw new Exception('Failed to save signature file');
        }
        
        // Get public URL
        $file_url = $upload_dir['baseurl'] . '/hubspot-signatures/' . $filename;
        
        // Log success
        error_log('[HubSpot E-Signature] Signature uploaded: ' . $filename);
        
        wp_send_json_success([
            'file_path' => $file_url,
            'local_path' => $file_path,
            'filename' => $filename,
            'size' => strlen($image_data),
            'type' => $image_type
        ]);
        
    } catch (Exception $e) {
        error_log('[HubSpot E-Signature] Upload error: ' . $e->getMessage());
        wp_send_json_error([
            'message' => 'Upload failed: ' . $e->getMessage()
        ]);
    }
}

// =============================================
// HUBSPOT INTEGRATION HANDLER
// =============================================

/**
 * Process HubSpot form submission with signature
 */
add_action('wp_ajax_process_hubspot_signature_submission', 'hubspot_signature_process_submission');
add_action('wp_ajax_nopriv_process_hubspot_signature_submission', 'hubspot_signature_process_submission');

function hubspot_signature_process_submission() {
    try {
        // Get configuration
        $hubspot_config = hubspot_signature_get_config();
        
        if (!$hubspot_config['token'] || !$hubspot_config['portal_id']) {
            throw new Exception('HubSpot configuration missing');
        }
        
        // Get submission data
        $form_id = sanitize_text_field($_POST['form_id'] ?? '');
        $signature_path = esc_url_raw($_POST['signature_path'] ?? '');
        
        if (!$form_id || !$signature_path) {
            throw new Exception('Form ID and signature path required');
        }
        
        // Get HubSpot form submission data
        $submission_data = hubspot_signature_get_form_submission($form_id, $hubspot_config);
        
        if (!$submission_data) {
            throw new Exception('Could not retrieve form submission data');
        }
        
        // Upload signature to HubSpot File Manager
        $hubspot_file = hubspot_signature_upload_to_hubspot($signature_path, $hubspot_config);
        
        if (!$hubspot_file) {
            throw new Exception('Failed to upload signature to HubSpot');
        }
        
        // Update contact with signature information
        $contact_updated = false;
        if (!empty($submission_data['email'])) {
            $contact_updated = hubspot_signature_update_contact(
                $submission_data['email'],
                $hubspot_file['id'],
                $hubspot_config
            );
        }
        
        // Log success
        error_log('[HubSpot E-Signature] Processing completed for form: ' . $form_id);
        
        wp_send_json_success([
            'form_id' => $form_id,
            'hubspot_file_id' => $hubspot_file['id'],
            'hubspot_file_url' => $hubspot_file['url'],
            'contact_updated' => $contact_updated,
            'message' => 'Signature processed successfully'
        ]);
        
    } catch (Exception $e) {
        error_log('[HubSpot E-Signature] Processing error: ' . $e->getMessage());
        wp_send_json_error([
            'message' => 'Processing failed: ' . $e->getMessage()
        ]);
    }
}

// =============================================
// HUBSPOT API FUNCTIONS
// =============================================

/**
 * Get HubSpot configuration
 * EDIT THESE VALUES WITH YOUR HUBSPOT CREDENTIALS
 */
function hubspot_signature_get_config() {
    return [
        'token' => 'YOUR_HUBSPOT_PRIVATE_TOKEN',  // Replace with your token
        'portal_id' => 'YOUR_PORTAL_ID',          // Replace with your portal ID
        'folder_id' => 'YOUR_FOLDER_ID',          // Replace with your folder ID
        'api_base' => 'https://api.hubapi.com'
    ];
}

/**
 * Get HubSpot form submission data
 */
function hubspot_signature_get_form_submission($form_id, $config) {
    // This is a simplified version - you may need to implement actual form data retrieval
    // based on your specific HubSpot integration needs
    return [
        'form_id' => $form_id,
        'email' => '', // Extract from actual submission
        'submission_time' => current_time('mysql')
    ];
}

/**
 * Upload signature to HubSpot File Manager
 */
function hubspot_signature_upload_to_hubspot($local_file_path, $config) {
    // Convert URL to local path if needed
    if (strpos($local_file_path, 'http') === 0) {
        $upload_dir = wp_upload_dir();
        $local_file_path = str_replace($upload_dir['baseurl'], $upload_dir['basedir'], $local_file_path);
    }
    
    if (!file_exists($local_file_path)) {
        throw new Exception('Local signature file not found: ' . $local_file_path);
    }
    
    // Prepare file for upload
    $file_info = pathinfo($local_file_path);
    $mime_type = wp_check_filetype($local_file_path)['type'] ?: 'image/png';
    
    // Create cURL request
    $curl = curl_init();
    
    $post_fields = [
        'file' => new CURLFile($local_file_path, $mime_type, 'signature_' . time() . '.' . $file_info['extension']),
        'options' => json_encode([
            'access' => 'PRIVATE',
            'folderId' => $config['folder_id']
        ])
    ];
    
    curl_setopt_array($curl, [
        CURLOPT_URL => $config['api_base'] . '/filemanager/api/v3/files/upload',
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $post_fields,
        CURLOPT_HTTPHEADER => [
            'Authorization: Bearer ' . $config['token']
        ],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 60,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_SSL_VERIFYPEER => true
    ]);
    
    $response = curl_exec($curl);
    $http_code = curl_getinfo($curl, CURLINFO_HTTP_CODE);
    $curl_error = curl_error($curl);
    curl_close($curl);
    
    if ($curl_error) {
        throw new Exception('cURL error: ' . $curl_error);
    }
    
    if ($http_code !== 201) {
        throw new Exception('HubSpot upload failed: HTTP ' . $http_code . ' - ' . $response);
    }
    
    $result = json_decode($response, true);
    if (!$result || !isset($result['id'])) {
        throw new Exception('Invalid HubSpot response: ' . $response);
    }
    
    return $result;
}

/**
 * Update HubSpot contact with signature information
 */
function hubspot_signature_update_contact($email, $file_id, $config) {
    $update_data = [
        'properties' => [
            'signature_file_id' => $file_id,
            'signature_date' => date('c'),
            'signature_status' => 'signed',
            'last_signature_update' => time()
        ]
    ];
    
    $curl = curl_init();
    
    curl_setopt_array($curl, [
        CURLOPT_URL => $config['api_base'] . '/crm/v3/objects/contacts/' . urlencode($email) . '?idProperty=email',
        CURLOPT_CUSTOMREQUEST => 'PATCH',
        CURLOPT_POSTFIELDS => json_encode($update_data),
        CURLOPT_HTTPHEADER => [
            'Authorization: Bearer ' . $config['token'],
            'Content-Type: application/json'
        ],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 30,
        CURLOPT_SSL_VERIFYPEER => true
    ]);
    
    $response = curl_exec($curl);
    $http_code = curl_getinfo($curl, CURLINFO_HTTP_CODE);
    $curl_error = curl_error($curl);
    curl_close($curl);
    
    if ($curl_error) {
        error_log('[HubSpot E-Signature] Contact update cURL error: ' . $curl_error);
        return false;
    }
    
    if ($http_code !== 200) {
        error_log('[HubSpot E-Signature] Contact update failed: HTTP ' . $http_code . ' - ' . $response);
        return false;
    }
    
    return true;
}

// =============================================
// CONFIGURATION
// =============================================

/**
 * Simple configuration - just set your HubSpot credentials here
 * or use environment variables for security
 */

// =============================================
// UTILITY FUNCTIONS
// =============================================

/**
 * Clean up old signature files (run via cron)
 */
function hubspot_signature_cleanup_old_files() {
    $upload_dir = wp_upload_dir();
    $signature_dir = $upload_dir['basedir'] . '/hubspot-signatures';
    
    if (!is_dir($signature_dir)) {
        return;
    }
    
    $files = glob($signature_dir . '/signature_*.{png,jpg,jpeg,gif}', GLOB_BRACE);
    $old_threshold = time() - (7 * 24 * 60 * 60); // 7 days old
    
    foreach ($files as $file) {
        if (filemtime($file) < $old_threshold) {
            unlink($file);
        }
    }
}

// Schedule cleanup (run daily)
if (!wp_next_scheduled('hubspot_signature_cleanup')) {
    wp_schedule_event(time(), 'daily', 'hubspot_signature_cleanup');
}
add_action('hubspot_signature_cleanup', 'hubspot_signature_cleanup_old_files');

?>