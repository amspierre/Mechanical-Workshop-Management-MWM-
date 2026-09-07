const API_URL = window.MWM_API_URL || 'http://localhost:3000/api/v1';
const TOKEN_KEY = 'mwm_access_token';

document.addEventListener('DOMContentLoaded', () => {
	const form = document.getElementById('loginForm');
	if (!form) return;

	form.addEventListener('submit', async event => {
		event.preventDefault();
		const button = form.querySelector('button[type="submit"]');
		button.disabled = true;
		button.textContent = 'Signing in...';

		try {
			const response = await fetch(`${API_URL}/auth/login`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email: form.email.value.trim(), senha: form.senha.value })
			});
			const payload = await response.json().catch(() => ({}));
			if (!response.ok) throw new Error(payload.error?.message || 'Invalid credentials.');
			localStorage.setItem(TOKEN_KEY, payload.access_token);
			window.location.href = '../home-page/home-page.html';
		} catch (error) {
			window.alert(error.message || 'Could not sign in.');
			button.disabled = false;
			button.textContent = 'Submit';
		}
	});
});