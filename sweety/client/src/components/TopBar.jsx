import { useAuth } from '../AuthContext';

export default function TopBar() {
  const { user, logout } = useAuth();
  return (
    <header className="topbar">
      <span className="wordmark">Sweety</span>
      <span className="who">
        {user.name}
        {user.role === 'doctor' && <span className="badge">Doctor</span>}
        <button className="link" onClick={logout}>
          Log out
        </button>
      </span>
    </header>
  );
}
