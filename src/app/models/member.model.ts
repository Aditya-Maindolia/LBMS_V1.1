export interface Member {
  id?: string;
  memberName: string;
  email: string;
  countryCode: string;
  mobileNumber: string;
  address: string;
  dateOfBirth: string;
  password: string;
  secretQuestion: string;
  secretAnswer: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface MemberRegistrationRequest {
  memberName: string;
  email: string;
  countryCode: string;
  mobileNumber: string;
  address: string;
  dateOfBirth: string;
  password: string;
  secretQuestion: string;
  secretAnswer: string;
}

export interface MemberRegistrationResponse {
  success: boolean;
  message: string;
  memberId?: string;
  memberName?: string;
  email?: string;
}

export interface CountryCode {
  code: string;
  name: string;
  dialCode: string;
}
