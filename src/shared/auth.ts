export const AUTH_COOKIE_NAME = "auth";

export type Context = {
  userID: string;
};

declare module "@rocicorp/zero" {
  interface DefaultTypes {
    context: Context | undefined;
  }
}
