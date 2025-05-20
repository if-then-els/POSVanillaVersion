 document.getElementById('ownerSignupForm').addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Basic validation
            let isValid = true;
            
            // Validate Full Name
            const fullName = document.getElementById('fullName');
            if (!fullName.value.trim()) {
                fullName.parentElement.classList.add('error');
                isValid = false;
            } else {
                fullName.parentElement.classList.remove('error');
            }
            
            // Validate National ID (simple presence check)
            const nationalId = document.getElementById('nationalId');
            if (!nationalId.value.trim()) {
                nationalId.parentElement.classList.add('error');
                isValid = false;
            } else {
                nationalId.parentElement.classList.remove('error');
            }
            
            // Validate Phone Number (simple format check)
            const phoneNumber = document.getElementById('phoneNumber');
            const phoneRegex = /^\+?[0-9\s\-$$$$]{8,20}$/;
            if (!phoneRegex.test(phoneNumber.value.trim())) {
                phoneNumber.parentElement.classList.add('error');
                isValid = false;
            } else {
                phoneNumber.parentElement.classList.remove('error');
            }
            
            // Validate Email
            const email = document.getElementById('email');
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email.value.trim())) {
                email.parentElement.classList.add('error');
                isValid = false;
            } else {
                email.parentElement.classList.remove('error');
            }
            
            // Validate Password (simple length check)
            const password = document.getElementById('password');
            if (password.value.length < 8) {
                password.parentElement.classList.add('error');
                isValid = false;
            } else {
                password.parentElement.classList.remove('error');
            }
            
            if (isValid) {
                // Form is valid, you would typically submit it here
                console.log('Form is valid, submitting...');
                // Simulate submission success
                alert('Owner account creation successful!');
            }
        });