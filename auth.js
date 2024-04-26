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
    let json;
    try {
        const url = `https://api.wikitree.com/api.php?action=clientLogin&authcode=${authcode}`;
        console.log(url);
        const resp = await fetch(url);
        json = await resp.json();
        console.log('login()');
        console.log('authcode', authcode);
        console.log(JSON.stringify(json, null, 2));
    } catch (e) {
        console.error(e);
    }
    enableButtons();
    return json;
}

async function checkLogin(userId) {
    disableButtons();
    let json;
    try {
        const url = `https://api.wikitree.com/api.php?action=clientLogin&checkLogin=${userId}`;
        console.log(url);
        const resp = await fetch(url);
        json = await resp.json();
        console.log('checkLogin()');
        console.log('userId', userId);
        console.log(JSON.stringify(json, null, 2));
    } catch (e) {
        console.error(e);
    }
    enableButtons();
    return json;
}

async function logout() {
    disableButtons();
    let json;
    try {
        const url = `https://api.wikitree.com/api.php?action=clientLogin&doLogout=1`;
        console.log(url);
        const resp = await fetch(url);
        json = await resp.json();
        console.log('logout()');
        console.log(JSON.stringify(json, null, 2));
    } catch (e) {
        console.error(e);
    }
    enableButtons();
    return json;
}

function disableButtons() {
    $$('#login,#logout').forEach(btn => btn.disabled = true);
}

function enableButtons() {
    $$('#login,#logout').forEach(btn => btn.removeAttribute('disabled'));
}