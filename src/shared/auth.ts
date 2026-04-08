export type Context = {
  userID: string;
};

export type AppSession = {
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
