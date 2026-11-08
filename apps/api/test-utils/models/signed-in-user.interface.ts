export interface SignedInUser {
  userId: string;
  /** Value for the `Cookie` request header: `<session cookie name>=<signed value>`. */
  cookie: string;
}
