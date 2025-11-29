# HubSpot Form E-Signature Integration

**Add Digital Signature to Any HubSpot Form - Simple & Secure**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![HubSpot Compatible](https://img.shields.io/badge/HubSpot-Compatible-ff7a59)](https://hubspot.com)

Add e-signature functionality to your HubSpot forms with this simple, secure solution. Perfect for contracts, waivers, consent forms, and any document that needs digital signatures.

## 🎯 What This Does

1. **Adds signature pad** to your HubSpot form
2. **Users sign** with mouse or touch
3. **Signature saves** to HubSpot File Manager automatically  
4. **Contact record** gets updated with signature file

**Perfect for:** Contracts, waivers, consent forms, registration forms, legal documents

## ✨ How It Works

**Simple 3-Step Process:**

1. **JavaScript** injects signature pad into HubSpot form iframe
2. **User signs** on the canvas (works on desktop and mobile)  
3. **PHP server** securely uploads signature to HubSpot and updates contact

**Key Features:**
- ✅ Works with any HubSpot form
- ✅ Mobile-friendly touch signatures
- ✅ Secure server-side processing
- ✅ No API keys exposed in frontend
- ✅ Automatic file upload to HubSpot
- ✅ Contact records updated automatically
- ✅ WordPress compatible

## 📋 Quick Setup (5 Minutes)

### Step 1: HubSpot Setup

1. **Create HubSpot Private App:**
   - Go to Settings → Integrations → Private Apps
   - Create new app with these permissions:
     - `files` (to upload signatures)
     - `crm.objects.contacts.write` (to update contacts)
   - Copy your **Access Token**

2. **Setup Your Form:**
   - Add field: `signature_required_check` (Single-line text, Required)
   - Add **Rich Text** field (signature pad will replace this)
   - Copy your **Portal ID** and **Form ID**

3. **Create File Folder:**
   - Go to Marketing → Files → Create folder "Signatures"
   - Copy **Folder ID** from the URL

### Step 2: Install Files

**For WordPress:**
```php
// Add to your functions.php
include_once 'src/hubspot-signature-handler.php';
```

**For Regular PHP Site:**
- Upload `hubspot-signature-handler.php` to your server
- Edit the config section with your HubSpot credentials

### Step 3: Add to Your Website

Copy and paste this simple HTML:

```html
<!DOCTYPE html>
<html>
<head>
    <title>HubSpot Form with E-Signature</title>
    
    <!-- Required Libraries -->
    <script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/signature_pad@4.1.7/dist/signature_pad.umd.min.js"></script>
    <script src="//js.hsforms.net/forms/embed/v2.js"></script>
</head>
<body>
    <div id="hubspot-form-container"></div>
    
    <script>
        hbspt.forms.create({
            portalId: "YOUR_PORTAL_ID",      // Replace with your Portal ID
            formId: "YOUR_FORM_ID",          // Replace with your Form ID
            target: '#hubspot-form-container',
            
            onFormReady: function($form) {
                // Add signature pad to form
                addSignaturePad($form);
            },
            
            onBeforeFormSubmit: function($form) {
                // Upload signature before form submits
                return uploadSignature($form);
            }
        });
        
        // See examples/ folder for complete JavaScript code
    </script>
</body>
</html>
```

**That's it!** Your form now captures digital signatures.

## 📁 What's Included

```
/
├── src/
│   ├── hubspot-signature-handler.php           # Server-side PHP handler
│   └── hubspot-esignature-integration.js       # JavaScript integration code
├── examples/
│   └── complete-implementation-example.html    # Complete working example
└── README.md                                   # Setup guide & documentation
```

## 🛠️ How The Code Works

**JavaScript Part:**
1. Waits for HubSpot form to load
2. Finds the Rich Text field in the form
3. Replaces it with a signature canvas
4. Captures signature data when user signs
5. Uploads signature via AJAX before form submits

**PHP Part:**
1. Receives signature image data from JavaScript
2. Converts base64 to image file
3. Uploads file to HubSpot File Manager
4. Updates contact record with signature file link
5. Returns success/error response

**Security:**
- All HubSpot API calls happen server-side
- No API tokens exposed in frontend code
- Proper file validation and error handling

## 💡 Common Use Cases

- **Contract Signatures** - Service agreements, terms of service
- **Event Registration** - Liability waivers, event signups  
- **Medical Forms** - Patient consent, medical waivers
- **Legal Documents** - GDPR consent, compliance forms
- **Membership Applications** - Club signups, course enrollment

## 🚨 Troubleshooting

**Signature pad not showing?**
- Make sure your form has a Rich Text field
- Check that jQuery and SignaturePad libraries are loaded

**Form submits without signature?**
- Verify field name is `signature_required_check` 
- Check JavaScript console for errors

**Upload failing?**
- Confirm HubSpot token has `files` permission
- Check PHP error logs for details
- Verify folder ID is correct

## 📝 Need Help?

1. Follow the setup guide above for step-by-step instructions
2. Check `examples/complete-implementation-example.html` for working code
3. See troubleshooting section above for common issues

## 📄 License

MIT License - Free to use and modify

## ⭐ Star This Repo

If this helped you add e-signature to HubSpot forms, please star this repository!

---

**Perfect for developers who need HubSpot e-signature integration**