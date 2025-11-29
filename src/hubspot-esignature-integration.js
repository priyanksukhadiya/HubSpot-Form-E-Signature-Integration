/**
 * HubSpot E-Signature Integration - JavaScript Component
 * 
 * Clean, simple implementation based on working code pattern
 * Handles signature pad injection and form submission
 * Works with PHP server handlers for secure processing
 * 
 * @version 2.0.0
 * @license MIT
 */

class HubSpotESignatureIntegration {
    constructor(config = {}) {
        this.config = {
            portalId: config.portalId,
            formId: config.formId,
            region: config.region || 'na1',
            target: config.target || '#hubspot-form-container',
            
            // Server endpoints
            ajaxUrl: config.ajaxUrl || '/wp-admin/admin-ajax.php',
            uploadAction: config.uploadAction || 'upload_signature_image',
            processAction: config.processAction || 'process_hubspot_signature_submission',
            
            // Field configuration
            signatureFieldName: config.signatureFieldName || 'signature_required_check',
            signatureFieldValue: config.signatureFieldValue || 'signatured',
            
            // Canvas settings
            canvasWidth: config.canvasWidth || 500,
            canvasHeight: config.canvasHeight || 200,
            
            // UI settings
            showClearButton: config.showClearButton !== false,
            autoHideField: config.autoHideField !== false,
            
            ...config
        };
        
        this.signaturePad = null;
        this.signatureUrl = '';
        this.signatureField = null;
        
        // Initialize
        this.init();
    }
    
    init() {
        if (!this.validateDependencies()) {
            return false;
        }
        
        this.createForm();
        this.setupSubmissionHandler();
        
        console.log('[HubSpot E-Signature] Initialized');
        return true;
    }
    
    validateDependencies() {
        const missing = [];
        
        if (typeof SignaturePad === 'undefined') {
            missing.push('SignaturePad library');
        }
        
        if (typeof jQuery === 'undefined') {
            missing.push('jQuery library');
        }
        
        if (typeof hbspt === 'undefined') {
            missing.push('HubSpot forms library');
        }
        
        if (!this.config.portalId || !this.config.formId) {
            missing.push('Portal ID and Form ID');
        }
        
        if (missing.length > 0) {
            console.error('[HubSpot E-Signature] Missing dependencies:', missing.join(', '));
            return false;
        }
        
        return true;
    }
    
    createForm() {
        const self = this;
        
        hbspt.forms.create({
            portalId: this.config.portalId,
            formId: this.config.formId,
            region: this.config.region,
            target: this.config.target,
            
            onFormReady: function() {
                console.log('[HubSpot E-Signature] Form loaded');
                setTimeout(() => self.injectSignaturePad(), 2500);
            },
            
            onBeforeFormSubmit: function() {
                return self.handleSubmission();
            },
            
            onFormSubmitted: function($form, data) {
                self.handleFormSubmitted($form, data);
            }
        });
    }
    
    injectSignaturePad() {
        const iframe = document.querySelector(`${this.config.target} iframe`);
        
        if (!iframe) {
            console.error('[HubSpot E-Signature] Form iframe not found');
            return false;
        }
        
        const iframeDoc = iframe.contentWindow.document;
        const richTextField = iframeDoc.querySelector('.hs-richtext');
        
        if (!richTextField) {
            console.error('[HubSpot E-Signature] Rich text field not found - add one to your HubSpot form');
            return false;
        }
        
        // Create signature HTML
        richTextField.innerHTML = this.getSignatureHTML();
        
        // Initialize signature pad
        this.initSignaturePad(iframeDoc);
        
        // Setup field handling
        this.setupSignatureField(iframeDoc);
        
        console.log('[HubSpot E-Signature] Signature pad injected');
        return true;
    }
    
    getSignatureHTML() {
        const clearButton = this.config.showClearButton ? 
            `<button type="button" id="clear-signature" style="margin-top: 10px; padding: 8px 16px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;">Clear</button>` : '';
        
        return `
            <div style="border: 2px solid #007cba; border-radius: 8px; padding: 20px; margin: 15px 0; background: #f8f9fa;">
                <label style="font-weight: bold; display: block; margin-bottom: 8px;"><strong>Signature</strong></label>
                <canvas id="signature-pad" width="${this.config.canvasWidth}" height="${this.config.canvasHeight}" style="border: 1px solid #000; cursor: crosshair; display: block; max-width: 100%; touch-action: none;"></canvas>
                ${clearButton}
                <p id="signature-error" style="color: red; display: none; margin-top: 10px;">Please sign before submitting.</p>
            </div>
        `;
    }
    
    initSignaturePad(iframeDoc) {
        const canvas = iframeDoc.getElementById('signature-pad');
        
        if (!canvas) {
            console.error('[HubSpot E-Signature] Canvas not found');
            return false;
        }
        
        this.signaturePad = new SignaturePad(canvas, {
            backgroundColor: 'rgba(255, 255, 255, 0)',
            penColor: 'rgb(0, 0, 0)',
            velocityFilterWeight: 0.7,
            minWidth: 0.5,
            maxWidth: 2.5,
            throttle: 16
        });
        
        const self = this;
        
        // Handle drawing
        this.signaturePad.addEventListener('endStroke', function() {
            self.updateSignatureField();
            self.hideError();
        });
        
        // Setup clear button
        if (this.config.showClearButton) {
            const clearBtn = iframeDoc.getElementById('clear-signature');
            if (clearBtn) {
                clearBtn.onclick = function() {
                    self.clearSignature();
                };
            }
        }
        
        return true;
    }
    
    setupSignatureField(iframeDoc) {
        this.signatureField = iframeDoc.querySelector(`input[name="${this.config.signatureFieldName}"]`);
        
        if (!this.signatureField) {
            console.warn(`[HubSpot E-Signature] Field "${this.config.signatureFieldName}" not found`);
            return;
        }
        
        // Auto-hide field
        if (this.config.autoHideField) {
            setTimeout(() => {
                const container = this.signatureField.closest('.hs-form-field');
                if (container) {
                    container.style.display = 'none';
                }
            }, 500);
        }
        
        // Global reference for form submission
        window.signatureRequiredField = this.signatureField;
    }
    
    updateSignatureField() {
        if (!this.signatureField) return;
        
        const hasSignature = !this.signaturePad.isEmpty();
        this.signatureField.value = hasSignature ? this.config.signatureFieldValue : '';
        
        if (hasSignature) {
            this.signatureField.classList.remove('invalid', 'error');
        }
        
        // Trigger HubSpot validation
        const iframeWindow = this.signatureField.ownerDocument.defaultView;
        this.signatureField.dispatchEvent(new iframeWindow.Event('input', { bubbles: true }));
        this.signatureField.dispatchEvent(new iframeWindow.Event('change', { bubbles: true }));
        
        console.log('[HubSpot E-Signature] Field updated:', this.signatureField.value);
    }
    
    clearSignature() {
        if (this.signaturePad) {
            this.signaturePad.clear();
            this.updateSignatureField();
            this.hideError();
        }
    }
    
    validateSignature() {
        if (!this.signaturePad || this.signaturePad.isEmpty()) {
            this.showError('Please provide your signature before submitting.');
            return false;
        }
        return true;
    }
    
    handleSubmission() {
        if (!this.validateSignature()) {
            return false;
        }
        
        // Final field update
        this.updateSignatureField();
        
        // Upload signature
        this.uploadSignature();
        
        return false; // Prevent default until upload completes
    }
    
    uploadSignature() {
        if (!this.signaturePad || this.signaturePad.isEmpty()) {
            return;
        }
        
        const base64Data = this.signaturePad.toDataURL('image/png');
        const self = this;
        
        jQuery.ajax({
            url: this.config.ajaxUrl,
            type: 'POST',
            data: {
                action: this.config.uploadAction,
                signature_base64: base64Data
            },
            success: function(response) {
                if (response.success) {
                    self.signatureUrl = response.data.file_path;
                    console.log('[HubSpot E-Signature] Upload successful');
                    
                    // Submit form
                    setTimeout(() => {
                        const form = document.querySelector(`${self.config.target} iframe`)
                            .contentWindow.document.querySelector('.hs-form form');
                        if (form) {
                            form.submit();
                        }
                    }, 300);
                } else {
                    console.error('[HubSpot E-Signature] Upload failed:', response.data);
                    self.showError('Upload failed. Please try again.');
                }
            },
            error: function(xhr, status, error) {
                console.error('[HubSpot E-Signature] Upload error:', error);
                self.showError('Upload error. Please try again.');
            }
        });
    }
    
    handleFormSubmitted($form, data) {
        // Store form data for processing
        const submissionData = data.submissionValues || {};
        const hsContext = JSON.parse(submissionData.hs_context || "{}");
        const formData = hsContext.originalEmbedContext ? hsContext.originalEmbedContext.formId : "";
        
        document.cookie = `hs_signature_form_data=${formData}; path=/; max-age=3600;`;
        
        console.log('[HubSpot E-Signature] Form submitted');
    }
    
    setupSubmissionHandler() {
        const self = this;
        
        jQuery(document).ready(function($) {
            function getCookie(name) {
                const value = "; " + document.cookie;
                const parts = value.split("; " + name + "=");
                if (parts.length === 2) return parts.pop().split(";").shift();
            }
            
            const checkCookie = setInterval(() => {
                const formCookie = getCookie('hs_signature_form_data');
                if (formCookie) {
                    clearInterval(checkCookie);
                    
                    let formId;
                    try {
                        formId = JSON.parse(formCookie).formId;
                    } catch (e) {
                        formId = formCookie;
                    }
                    
                    if (formId) {
                        self.processSubmission(formId);
                    }
                    
                    // Clear cookie
                    document.cookie = 'hs_signature_form_data=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
                }
            }, 2000);
        });
    }
    
    processSubmission(formId) {
        console.log('[HubSpot E-Signature] Processing submission...');
        
        this.showLoading();
        
        const self = this;
        
        jQuery.ajax({
            url: this.config.ajaxUrl,
            type: 'POST',
            data: {
                action: this.config.processAction,
                form_id: formId,
                signature_path: this.signatureUrl
            },
            success: function(response) {
                if (response.success) {
                    self.hideLoading();
                    self.showSuccess();
                } else {
                    console.error('[HubSpot E-Signature] Processing failed:', response.data.message);
                    self.hideLoading();
                    alert('Processing failed. Please try again.');
                }
            },
            error: function() {
                console.error('[HubSpot E-Signature] Processing error');
                self.hideLoading();
                alert('Submission failed. Please try again.');
            }
        });
    }
    
    // UI Helper Methods
    
    showError(message) {
        const iframe = document.querySelector(`${this.config.target} iframe`);
        if (iframe) {
            const errorEl = iframe.contentWindow.document.getElementById('signature-error');
            if (errorEl) {
                errorEl.textContent = message;
                errorEl.style.display = 'block';
            }
        }
    }
    
    hideError() {
        const iframe = document.querySelector(`${this.config.target} iframe`);
        if (iframe) {
            const errorEl = iframe.contentWindow.document.getElementById('signature-error');
            if (errorEl) {
                errorEl.style.display = 'none';
            }
        }
    }
    
    showLoading() {
        const loader = document.getElementById('memberRegisterSplash');
        if (loader) {
            loader.style.display = 'block';
            document.body.style.overflow = 'hidden';
            document.body.style.pointerEvents = 'none';
        }
    }
    
    hideLoading() {
        const loader = document.getElementById('memberRegisterSplash');
        if (loader) {
            loader.style.display = 'none';
            document.body.style.overflow = '';
            document.body.style.pointerEvents = '';
        }
    }
    
    showSuccess() {
        const success = document.getElementById('event-submission-success');
        if (success) {
            success.style.display = 'block';
            setTimeout(() => success.style.display = 'none', 2500);
        }
    }
    
    // Public API
    
    getSignatureDataURL() {
        return this.signaturePad ? this.signaturePad.toDataURL() : null;
    }
    
    isEmpty() {
        return this.signaturePad ? this.signaturePad.isEmpty() : true;
    }
    
    getSignatureUrl() {
        return this.signatureUrl;
    }
    
    destroy() {
        if (this.signaturePad) {
            this.signaturePad.clear();
        }
        this.signaturePad = null;
        this.signatureUrl = '';
        this.signatureField = null;
    }
}

// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HubSpotESignatureIntegration;
} else if (typeof define === 'function' && define.amd) {
    define([], function() { return HubSpotESignatureIntegration; });
} else {
    window.HubSpotESignatureIntegration = HubSpotESignatureIntegration;
}

console.log('[HubSpot E-Signature] Library loaded');