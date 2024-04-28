const $ = document.querySelector.bind(document);
const $$ = selector => [...document.querySelectorAll(selector)];

export async function authenticate() {
    $('#logout').onclick = async function () {
        await logout();
        localStorage.clear();
        $('.status').textContent = 'Logged out.';
    }

    $('[name="returnURL"]').value = location.href;
    const userName = localStorage.getItem('userName');
    const userId = localStorage.getItem('userId');
    const urlSearchParams = new URLSearchParams(location.search);
    const authcode = urlSearchParams.get('authcode');
    if (authcode) {
        $('.status').textContent = 'Logging in…';
        const json = await login(authcode);
        if (json.clientLogin?.result === 'Success') {
            const { userid: userId, username: userName } = json.clientLogin;
            localStorage.setItem('userName', userName);
            localStorage.setItem('userId', userId);
            const url = new URL(location.href);
            url.searchParams.delete('authcode');
            history.pushState({}, document.title, url);
            $('.status').textContent = `Logged in as ${userName}.`;
        } else {
            $('.status').textContent = 'Login failed.';
        }
    } else if (userId) {
        const json = await checkLogin(userId);
        if (json.clientLogin?.result === 'ok') {
            $('.status').textContent = `Already logged in as ${userName}.`;
        } else {
            $('.status').textContent = 'Not logged in anymore.';
            localStorage.clear();
        }
    } else {
        $('.status').textContent = 'Not logged in yet.';
    }
}

async function login(authcode) {
    disableButtons();
    const url = `https://api.wikitree.com/api.php?action=clientLogin&authcode=${authcode}`;
    const resp = await fetch(url, { credentials: 'include' });
    const json = await resp.json();
    enableButtons();
    return json;
}

async function checkLogin(userId) {
    disableButtons();
    const url = `https://api.wikitree.com/api.php?action=clientLogin&checkLogin=${userId}`;
    const resp = await fetch(url, { credentials: 'include' });
    const json = await resp.json();
    enableButtons();
    return json;
}

async function logout() {
    disableButtons();
    const url = `https://api.wikitree.com/api.php?action=clientLogin&doLogout=1`;
    const resp = await fetch(url, { credentials: 'include' });
    const json = await resp.json();
    enableButtons();
    return json;
}

function disableButtons() {
    $$('#login,#logout').forEach(btn => btn.disabled = true);
}

function enableButtons() {
    $$('#login,#logout').forEach(btn => btn.removeAttribute('disabled'));
}