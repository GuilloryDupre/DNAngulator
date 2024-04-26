
export async function getAncestors(wikiTreeID, depth) {
    const appId = 'DNAngulator';
    const action = 'getAncestors';
    const key = wikiTreeID;
    const fields = [
        'Name',
        'FirstName',
        'MiddleName',
        'LastNameAtBirth',
        'LastNameCurrent',
        'Gender',
        'BirthDateDecade',
        'DeathDateDecade',
        'IsLiving',
        'Father',
        'Mother',
        'Id'
    ];
    const resolveRedirect = 1;
    const json = await hitAPI({
        action,
        appId,
        key,
        fields,
        depth,
        resolveRedirect
    });
    return json;
}

async function hitAPI(postData) {
    const formData = new FormData();
    for (const key in postData) formData.append(key, postData[key]);
    const resp = await fetch('https://api.wikitree.com/api.php/', {
        method: 'POST',
        credentials: 'include',
        body: formData
    });
    return await resp.json();
}
