export type Context = {
  userID: string;
};

export type AppUser = {
  id: string;
  name: string;
  partner: boolean;
};

export type AppSession = {
  appUser: AppUser;
  session: {
    id: string;
    expiresAt: string | Date;
  };
  user: {
    id: string;
    email: string;
    name: string;
  };
};

declare module "@rocicorp/zero" {
  interface DefaultTypes {
    context: Context;
  }
}
