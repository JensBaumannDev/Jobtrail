export interface CurrentUser {
  username: string;
  is_guest: boolean;
  expires_at: string | null;
}
