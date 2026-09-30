// A "Log out" button for page headers. It's a plain form, so it works even
// before the page's JavaScript loads.
export default function SignOutButton() {
  return <form method="post" action="/auth/signout">
    <button className="secondary-button" type="submit">Log out</button>
  </form>;
}
