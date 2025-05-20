
        // Form Validation
        const businessSetupForm = document.getElementById('businessSetupForm');
        const successMessage = document.getElementById('successMessage');
        
        businessSetupForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            let isValid = true;
            
            // Validate Business Name
            const businessName = document.getElementById('businessName');
            if (!businessName.value.trim()) {
                businessName.parentElement.classList.add('error');
                isValid = false;
            } else {
                businessName.parentElement.classList.remove('error');
            }
            
            // Validate Business Location
            const businessLocation = document.getElementById('businessLocation');
            if (!businessLocation.value.trim()) {
                businessLocation.parentElement.classList.add('error');
                isValid = false;
            } else {
                businessLocation.parentElement.classList.remove('error');
            }
            
            // Validate Business Phone
            const businessPhone = document.getElementById('businessPhone');
            const phoneRegex = /^\+?[0-9\s\-()]{8,20}$/;
            if (!phoneRegex.test(businessPhone.value.trim())) {
                businessPhone.parentElement.classList.add('error');
                isValid = false;
            } else {
                businessPhone.parentElement.classList.remove('error');
            }
            
            // Validate Business Type
            const businessType = document.getElementById('businessType');
            if (!businessType.value.trim()) {
                businessType.parentElement.classList.add('error');
                isValid = false;
            } else {
                businessType.parentElement.classList.remove('error');
            }
            
            if (isValid) {
                // Form is valid, show success message
                successMessage.classList.add('show');
                
                // Hide success message after 3 seconds
                setTimeout(() => {
                    successMessage.classList.remove('show');
                    
                    // In a real application, you would redirect to the next step here
                    console.log('Form submitted successfully with:');
                    console.log('Business Name:', businessName.value);
                    console.log('Business Location:', businessLocation.value);
                    console.log('Business Phone:', businessPhone.value);
                    console.log('Business Type:', businessType.value);
                }, 3000);
            }
        });