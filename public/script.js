const $ = document.querySelector.bind(document);
const $$ = selector => [...document.querySelectorAll(selector)];

const PROFILE_IDS = new URLSearchParams(location.search).get('ids')?.split(',');
if (PROFILE_IDS) {
    $('#number').value = PROFILE_IDS.length;
    $$('.id').forEach((input, i) => {
        const profileId = PROFILE_IDS[i];
        if (profileId) {
            input.value = profileId;
        } else {
            input.remove();
        }
    });
}

$('#dnangulate').addEventListener('click', async function () {
    this.disabled = true;
    $('#common-ancestors').disabled = true;
    $('#trees').disabled = true;

    const ids = $$('.id').map(({ value }) => value);
    const dnangulation = await DNAngulate(ids);
    console.log(dnangulation);
    const { triangulations, allPersons: persons } = dnangulation;

    const commonAncestors = triangulations.map(([id]) => ({ id, label: prettifyId(id, persons) }));
    [...$('#common-ancestors').children].forEach(child => child.remove());
    commonAncestors.forEach(ancestor => {
        const treeCount = triangulations
            .find(([Id]) => Id === ancestor.id)[1]
            .length;
        const option = document.createElement('option');
        option.value = ancestor.id;
        option.textContent = `(${treeCount} tree${treeCount === 1 ? '' : 's'}) ${ancestor.label}`;
        $('#common-ancestors').appendChild(option);
    });
    $('[for="common-ancestors"]').textContent = `${commonAncestors.length} Common Ancestors:`;

    $('#common-ancestors').onchange = function () {
        const id = Number(this.value);
        const trees = triangulations
            .find(([Id]) => Id === id)[1]
            .map(tree => {
                return tree.map(path => {
                    return path.map(Id => ({ id: Id, label: prettifyId(Id, persons) }));
                });
            });
        console.log(trees);

        [...$('#trees').children].forEach(child => child.remove());
        trees.forEach((tree, i) => {
            const avgLen = tree.reduce((avgLen, { length }) => {
                return avgLen + length;
            }, 0) / tree.length;
            const option = document.createElement('option');
            option.value = JSON.stringify(tree);
            option.textContent = `#${i + 1}. ${trees.length > 1 ? 'Average ' : ''}Generations: ${avgLen.toFixed(1)}`;
            $('#trees').appendChild(option);
        });

        $('[for="trees"]').textContent = `${trees.length} Tree${trees.length === 1 ? '' : 's'}:`;

        $('#trees').dispatchEvent(new Event('change'));
    };

    $('#trees').onchange = function () {
        const tree = JSON.parse(this.value);
        console.log(tree);

        /*[...$('thead').children].forEach(child => child.remove());
        ids.forEach(id => {
            const th = document.createElement('th');
            th.textContent = id;
            $('thead').appendChild(th);
        });*/

        [...$('tbody').children].forEach(child => child.remove());
        const caTr = document.createElement('tr');
        $('tbody').appendChild(caTr);
        const caTd = document.createElement('td');
        caTr.appendChild(caTd);
        caTd.textContent = tree[0][tree[0].length - 1].label;
        caTd.setAttribute('colspan', 3);

        const maxLen = Math.max(...tree.map(({ length }) => length));
        for (let i = 0; i < maxLen - 1; i++) {
            const ancestors = tree.map(path => path.toReversed().slice(1)[i]);
            const tr = document.createElement('tr');
            $('tbody').appendChild(tr);
            ancestors.forEach(ancestor => {
                const td = document.createElement('td');
                tr.appendChild(td);
                const label = ancestor?.label;
                if (!label) return;
                const [name, separator, timespan] = label.split(/(\(\d)/);
                const p1 = document.createElement('p');
                const p2 = document.createElement('p');
                p1.textContent = name;
                p2.textContent = separator + timespan;
                td.appendChild(p1);
                td.appendChild(p2);
            });
        }
    }

    $('#common-ancestors').dispatchEvent(new Event('change'));
    $('#trees').dispatchEvent(new Event('change'));

    this.disabled = false;
    $('#common-ancestors').disabled = false;
    $('#trees').disabled = false;
});

function prettifyId(id, persons) {
    const person = persons.find(({ Id }) => Id === Number(id));
    const { Id, Gender, FirstName, MiddleName, LastNameAtBirth, LastNameCurrent, BirthDateDecade, DeathDateDecade, IsLiving } = person;
    const name = [
        (Gender === 'Male' ? '♂' : '♀'),
        FirstName || '',
        MiddleName || '',
        LastNameAtBirth !== LastNameCurrent ? '(' + LastNameAtBirth + ')' : '',
        LastNameCurrent || '',
    ].join(' ').replace(/ +/g, ' ');
    const timespan = [
        BirthDateDecade,
        '-',
        IsLiving ? 'living' : DeathDateDecade
    ].join('').replace(/ +/g, ' ');
    return name + ' (' + timespan + ')';
}

async function DNAngulate(ids) {
    const resp = await fetch('/api?ids=' + ids.join(','));
    if (resp.status !== 200) {
        alert(resp.statusText || 'There was an error.');
        console.error(resp.statusText);

        $('#dnangulate').disabled = false;
        $('#common-ancestors').disabled = false;
        $('#trees').disabled = false;
    }
    const json = await resp.json();
    return json;
}

$('#number').addEventListener('input', function () {
    const targetCount = Math.max(2, Number(this.value));
    const currentCount = $$('.id').length;
    if (targetCount > currentCount) {
        for (let i = currentCount; i < targetCount; i++) {
            const input = document.createElement('input');
            input.classList.add('id');
            input.placeholder = 'Profile ID #' + (i + 1);
            $('.profile-ids').appendChild(input);
        }
    } else if (targetCount < currentCount) {
        while (targetCount < $$('.id').length) {
            $('.id:last-of-type').remove();
        }
    }
});