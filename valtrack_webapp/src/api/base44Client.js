export const base44 = {
    auth: {
        me: async () => {
            const storedUser = localStorage.getItem('base44_user');
            if (storedUser) {
                return JSON.parse(storedUser);
            }
            throw { status: 401 };
        },
        login: async (email, password) => {
            // Mock login - auto succeeds for demo
            const user = {
                id: 'demo-user-123',
                email: email || 'demo@example.com',
                first_name: 'Demo',
                last_name: 'User',
                role: 'admin'
            };
            localStorage.setItem('base44_user', JSON.stringify(user));
            return user;
        },
        logout: (redirectUrl) => {
            localStorage.removeItem('base44_user');
            if (redirectUrl) {
                window.location.href = redirectUrl;
            } else {
                window.location.reload();
            }
        },
        redirectToLogin: (redirectUrl) => {
            // Since we don't have a real login page, we'll just alert or simulate a login prompt in a real app.
            // For now, let's just log it.
            console.log('Redirect to login requested', redirectUrl);
            // Optionally could force a login here for dev convenience
            const user = {
                id: 'demo-user-123',
                email: 'demo@example.com',
                first_name: 'Demo',
                last_name: 'User',
                role: 'admin'
            };
            localStorage.setItem('base44_user', JSON.stringify(user));
            window.location.reload();
        }
    },
    appLogs: {
        logUserInApp: async (page) => {
            console.log(`[Mock] Logged user in page: ${page}`);
            return Promise.resolve();
        }
    }
};
