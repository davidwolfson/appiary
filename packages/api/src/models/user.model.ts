export interface UserModel {
  id: string;
  accountId: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserWithAccountModel extends UserModel {
  accountName: string;
}

