import styles from './AuthForm.module.css';

export function AuthConfigurationPanel() {
  return (
    <div className={styles.configuration}>
      <p>
        Copy <code>.env.example</code> to <code>.env.local</code>, then add the hosted Supabase project URL and publishable key.
      </p>
      <p>
        Setup details remain in <code>README.md</code> and <code>docs/SUPABASE-SETUP.md</code>.
      </p>
    </div>
  );
}
