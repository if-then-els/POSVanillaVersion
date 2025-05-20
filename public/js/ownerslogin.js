 // Basic form validation
        document.getElementById('ownerLoginForm').addEventListener('submit', function(e) {
            e.preventDefault();
            
            let isValid = true;
            
            // Validate Phone Number
            const phoneNumber = document.getElementById('phoneNumber');
            const phoneNumberError = phoneNumber.parentElement.nextElementSibling;
            const phoneRegex = /^\+?[0-9\s\-()]{8,20}$/;
            
            if (!phoneRegex.test(phoneNumber.value.trim())) {
                phoneNumber.classList.add('border-red-500');
                phoneNumber.classList.remove('border-gray-border');
                phoneNumberError.classList.remove('hidden');
                isValid = false;
            } else {
                phoneNumber.classList.remove('border-red-500');
                phoneNumber.classList.add('border-gray-border');
                phoneNumberError.classList.add('hidden');
            }
            
            // Validate Password
            const password = document.getElementById('password');
            const passwordError = password.parentElement.nextElementSibling;
            
            if (!password.value.trim()) {
                password.classList.add('border-red-500');
                password.classList.remove('border-gray-border');
                passwordError.classList.remove('hidden');
                isValid = false;
            } else {
                password.classList.remove('border-red-500');
                password.classList.add('border-gray-border');
                passwordError.classList.add('hidden');
            }
            
            if (isValid) {
                // Form is valid, you would typically submit it here
                console.log('Form is valid, submitting...');
                // Simulate successful login
                alert('Login successful!');
            }
        });