import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { MemberService } from '../../services/member.service';
import { CountryCode, MemberRegistrationRequest, MemberRegistrationResponse } from '../../models/member.model';

@Component({
  selector: 'app-member-registration',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './member-registration.component.html',
  styleUrls: ['./member-registration.component.css'],
})
export class MemberRegistrationComponent implements OnInit {
  registrationForm!: FormGroup;
  countryCodes: CountryCode[] = [];
  isLoading = false;
  showSuccessModal = false;
  registrationResponse: MemberRegistrationResponse | null = null;
  maxDate: string = '';

  secretQuestions = [
    'What is your birth place?',
    "What is your pet's name?",
    "What is your mother's maiden name?",
    'What was your first school name?',
    'What is your favorite book?',
    'What is your childhood nickname?',
  ];

  emailTaken = false;
  mobileTaken = false;

  constructor(
    private fb: FormBuilder,
    private memberService: MemberService,
    private router: Router
  ) {
    this.setMaxDate();
  }

  ngOnInit(): void {
    this.countryCodes = this.memberService.getCountryCodes();
    this.initForm();
    this.setupValueChangeHandlers();
  }

  private initForm(): void {
    this.registrationForm = this.fb.group(
      {
        memberName: ['', [Validators.required, Validators.maxLength(50), this.nameValidator()]],
        email: ['', [Validators.required, this.strictEmailValidator()]],
        countryCode: ['+91', Validators.required],
        mobileNumber: ['', [Validators.required, Validators.pattern(/^[6-9]\d{9}$/), this.noInvalidMobilePatternValidator()]],
        address: ['', [Validators.required, Validators.maxLength(200)]],
        dateOfBirth: ['', [Validators.required, this.ageValidator(14)]],
        password: ['', [Validators.required, Validators.minLength(8), this.passwordValidator()]],
        confirmPassword: ['', Validators.required],
        secretQuestion: ['', Validators.required],
        secretAnswer: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      },
      {
        validators: this.confirmPasswordValidator('password', 'confirmPassword'),
      }
    );
  }

  private noInvalidMobilePatternValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const val: string = control.value;
      if (!val) return null;

      const disallowedAllZeros = /^[6-9]0{9}$/;
      const repeatingDigitsRegex = /(.)\1{5,}/;

      if (disallowedAllZeros.test(val)) {
        return { invalidMobilePattern: true };
      }

      if (repeatingDigitsRegex.test(val)) {
        return { invalidMobilePattern: true };
      }

      return null;
    };
  }

  private setupValueChangeHandlers(): void {
    this.registrationForm.get('email')?.valueChanges.subscribe((email) => {
      if (!email) {
        this.emailTaken = false;
        return;
      }
      this.emailTaken = this.memberService.existsByEmail(email.trim().toLowerCase());
      const emailControl = this.registrationForm.get('email');
      if (this.emailTaken) {
        emailControl?.setErrors({ emailTaken: true });
      } else if (emailControl?.hasError('emailTaken')) {
        const errors = emailControl.errors;
        if (errors) {
          delete errors['emailTaken'];
          if (!Object.keys(errors).length) emailControl.setErrors(null);
        }
      }
    });

    this.registrationForm.get('mobileNumber')?.valueChanges.subscribe((mobile) => {
      if (!mobile) {
        this.mobileTaken = false;
        return;
      }
      this.mobileTaken = this.memberService.existsByMobile(mobile);
      const mobileControl = this.registrationForm.get('mobileNumber');
      if (this.mobileTaken) {
        mobileControl?.setErrors({ mobileTaken: true });
      } else if (mobileControl?.hasError('mobileTaken')) {
        const errors = mobileControl.errors;
        if (errors) {
          delete errors['mobileTaken'];
          if (!Object.keys(errors).length) mobileControl.setErrors(null);
        }
      }
    });

    this.registrationForm.get('password')?.valueChanges.subscribe(() => {
      this.registrationForm.get('confirmPassword')?.updateValueAndValidity();
    });
  }

  private nameValidator(): ValidatorFn {
    const regex = /^[A-Za-z ]{3,}$/;
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      if (!value) return null;
      return regex.test(value) ? null : { invalidName: true };
    };
  }

  private ageValidator(minAge: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const val = control.value;
      if (!val) return null;
      const dob = new Date(val);
      const today = new Date();
      const minDate = new Date(today.getFullYear() - minAge, today.getMonth(), today.getDate());
      return dob <= minDate ? null : { ageTooLow: true };
    };
  }

  private passwordValidator(): ValidatorFn {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?#&])[A-Za-z\d@$!%*?#&]{8,}$/;
    return (control: AbstractControl): ValidationErrors | null => {
      const val = control.value;
      if (!val) return null;
      return regex.test(val) ? null : { weakPassword: true };
    };
  }

  private confirmPasswordValidator(passwordKey: string, confirmPasswordKey: string): ValidatorFn {
    return (group: AbstractControl): ValidationErrors | null => {
      const password = group.get(passwordKey)?.value;
      const confirmPassword = group.get(confirmPasswordKey)?.value;
      if (password && confirmPassword && password !== confirmPassword) {
        group.get(confirmPasswordKey)?.setErrors({ passwordsMismatch: true });
        return { passwordsMismatch: true };
      }
      return null;
    };
  }

  private strictEmailValidator(): ValidatorFn {
    const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Za-z]{2,}$/;
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      if (!value) return null;
      return regex.test(value) ? null : { invalidEmail: true };
    };
  }

  private setMaxDate(): void {
    const today = new Date();
    const minAge = 14;
    const maxDate = new Date(today.getFullYear() - minAge, today.getMonth(), today.getDate());
    this.maxDate = maxDate.toISOString().split('T')[0];
  }

  getFieldError(fieldName: string): string {
    const control = this.registrationForm.get(fieldName);
    if (!control || !control.touched || !control.errors) return '';

    if (control.errors['required'])
      return `${this.getFriendlyName(fieldName)} is required.`;
    if (control.errors['email'])
      return `Please enter a valid email address.`;
    if (control.errors['emailTaken'])
      return `Email is already registered.`;
    if (control.errors['invalidName'])
      return `Name must contain at least 3 letters and only alphabets/spaces.`;
    if (control.errors['pattern'])
      return `Invalid format for ${this.getFriendlyName(fieldName)}.`;
    if (control.errors['ageTooLow'])
      return `You must be at least 14 years old.`;
    if (control.errors['weakPassword'])
      return `Password is weak. Must have uppercase, lowercase, number, and special character.`;
    if (control.errors['passwordsMismatch'])
      return `Passwords do not match.`;
    if (control.errors['mobileTaken'])
      return `Mobile number is already registered.`;
    if (control.errors['minlength'])
      return `${this.getFriendlyName(fieldName)} is too short.`;
    if (control.errors['maxlength'])
      return `${this.getFriendlyName(fieldName)} is too long.`;

    return `Invalid ${this.getFriendlyName(fieldName)}.`;
  }

  private getFriendlyName(field: string): string {
    const map: Record<string, string> = {
      memberName: 'Name',
      email: 'Email',
      countryCode: 'Country Code',
      mobileNumber: 'Mobile Number',
      address: 'Address',
      dateOfBirth: 'Date of Birth',
      password: 'Password',
      confirmPassword: 'Confirm Password',
      secretQuestion: 'Security Question',
      secretAnswer: 'Security Answer',
    };
    return map[field] || field;
  }

  onSubmit(): void {
    if (this.registrationForm.invalid) {
      this.markAllTouched();
      return;
    }

    this.isLoading = true;
    const data: MemberRegistrationRequest = {
      memberName: this.registrationForm.value.memberName.trim(),
      email: this.registrationForm.value.email.trim().toLowerCase(),
      countryCode: this.registrationForm.value.countryCode,
      mobileNumber: this.registrationForm.value.mobileNumber,
      address: this.registrationForm.value.address.trim(),
      dateOfBirth: this.registrationForm.value.dateOfBirth,
      password: this.registrationForm.value.password,
      secretQuestion: this.registrationForm.value.secretQuestion,
      secretAnswer: this.registrationForm.value.secretAnswer.trim(),
    };

    this.memberService.registerMember(data).subscribe({
      next: (response) => {
        this.registrationResponse = response;
        this.showSuccessModal = true;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        alert('Registration failed. Try again later.');
      },
    });
  }

  onReset(): void {
    this.registrationForm.reset();
    this.registrationForm.patchValue({ countryCode: '+91' });
    this.emailTaken = false;
    this.mobileTaken = false;
  }

  private markAllTouched(): void {
    Object.values(this.registrationForm.controls).forEach((control) => control.markAsTouched());
  }

  closeSuccessModal(): void {
    this.showSuccessModal = false;
  }

  navigateToLogin(): void {
    this.router.navigate(['/login']);
  }

  get isFormValid(): boolean {
    return this.registrationForm.valid && !this.emailTaken && !this.mobileTaken;
  }
}
