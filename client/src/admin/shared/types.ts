export interface Admin {
  id: number;
  username: string;
  email: string;
  role: string;
  permissions?: string[];
}
