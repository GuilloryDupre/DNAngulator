import { authenticate } from './auth.js';
import { DNAngulate } from './dnangulate.js';

const DEPTH = 10;

const $ = document.querySelector.bind(document);
const $$ = selector => [...document.querySelectorAll(selector)];

authenticate();

$('#dnangulate').addEventListener('click', async function () {
    this.disabled = true;
    $('#common-ancestors').disabled = true;
    $('#trees').disabled = true;

    const ids = $$('.id').map(({ value }) => value);
    const kits = $$('.gedmatch').map(({ value }) => value);
    const company = $('#company').value;
    updateURL(ids, kits, company);
    const dnangulation = await DNAngulate(DEPTH, ...ids);
    console.log(dnangulation);
    const { triangulations, allPersons: persons } = dnangulation;

    const commonAncestors = triangulations.map(([id]) => {
        const person = persons.find(person => person.Id === id);
        const { label, name, genderSymbol, timespan } = prettifyPerson(person);
        return {
            id: person.Id,
            idStr: person.Name,
            label,
            name,
            genderSymbol,
            timespan
        };
    });
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
                    return path.map(Id => {
                        const person = persons.find(person => person.Id === Id);
                        const { label, name, genderSymbol, timespan } = prettifyPerson(person);
                        return {
                            id: Id,
                            idStr: person.Name,
                            label,
                            name,
                            genderSymbol,
                            timespan
                        };
                    });
                });
            });
        //console.log(trees);

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
        //g(tree);

        tree.forEach(path => {
            path.forEach((person, i) => {
                const parent = path[i + 1];
                if (!parent) return;
                person.parentGenderSymbol = parent.genderSymbol;
                person.gender = person.genderSymbol === '♂' ? 'male' : 'female';
                person.parentGender = person.parentGenderSymbol === '♂' ? 'male' : 'female';
                person.childLabel = person.gender === 'male' ? 'son' : 'daughter';
                //console.log(parent.name, 'is the', parent.genderSymbol, 'of', person.name);
            });
        });

        $('table').setAttribute('data-tree', JSON.stringify(tree));

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

        const span1 = document.createElement('span');
        const a = document.createElement('a');
        const br = document.createElement('br');
        const span2 = document.createElement('span');

        const MRCA = tree[0][tree[0].length - 1];

        span1.textContent = MRCA.genderSymbol;
        span1.classList.add('margin-right');
        caTd.appendChild(span1);
        a.textContent = MRCA.name;
        a.href = 'https://www.wikitree.com/wiki/' + MRCA.idStr;
        a.setAttribute('target', '_blank');
        caTd.appendChild(a);
        caTd.appendChild(br);
        span2.textContent = MRCA.timespan;
        caTd.appendChild(span2);
        caTd.setAttribute('colspan', 3);

        const maxLen = Math.max(...tree.map(({ length }) => length));
        for (let i = 0; i < maxLen - 1; i++) {
            const ancestors = tree.map(path => path
                .toReversed()
                .slice(1)[i]
            );
            const tr = document.createElement('tr');
            $('tbody').appendChild(tr);
            ancestors.forEach((ancestor, branchIndex) => {
                const td = document.createElement('td');
                tr.appendChild(td);

                if (!ancestor) return;

                td.setAttribute('data-branch', branchIndex);

                const span1 = document.createElement('span');
                const a = document.createElement('a');
                const br = document.createElement('br');
                const span2 = document.createElement('span');

                span1.textContent = ancestor.genderSymbol;
                span1.classList.add('margin-right');
                td.appendChild(span1);
                a.textContent = ancestor.name;

                const customFirstNames = $$('.profile').reduce((customFirstNames, div) => {
                    const firstName = div.querySelector('.first-name').value;
                    const key = div.querySelector('.id').value;
                    customFirstNames[key] = firstName;
                    return customFirstNames;
                }, {});

                if (customFirstNames[ancestor.idStr]) {
                    ancestor.customName = customFirstNames[ancestor.idStr] + ' ' + ancestor.name;
                    a.textContent = ancestor.customName;
                    const person = persons.find(({ Id }) => Id === ancestor.id);
                    person.customName = ancestor.customName;
                }

                a.href = 'https://www.wikitree.com/wiki/' + ancestor.idStr;
                a.setAttribute('target', '_blank');
                td.appendChild(a);
                const badge = addBadge(td);
                td.appendChild(br);
                span2.textContent = ancestor.timespan;
                td.appendChild(span2);
                badge?.setAttribute('data-id', ancestor.id);
                badge?.setAttribute('data-parent-gender-symbol', ancestor.parentGenderSymbol);
                badge?.addEventListener('click', function () {
                    const id = Number(this.getAttribute('data-id'));
                    const person = persons.find(({ Id }) => Id === id);
                    //console.log(person);

                    const members = tree.map(([{ id }]) => ({ ...persons.find(p => p.Id === id) }));
                    members.forEach(member => {
                        const branch = tree.find(([{ id }]) => id === member.Id);
                        const genLen = branch.length - 2;
                        member.genLen = genLen;
                        const { name, customName } = prettifyPerson(member);
                        member.tag = `[[${member.Name}|${customName || name}]]`;
                        member.gx = branch.length - 3;

                        const idx = ids.indexOf(member.Name);
                        const kit = kits[idx];
                        member.kit = kit;
                    });

                    function getRelation(a, b) {
                        const timesRemoved = Math.abs(a.genLen - b.genLen);
                        let shortest = a.genLen > b.genLen ? b : a.genLen === b.genLen ? null : a;
                        //console.log('shortest of', a.LastNameAtBirth, 'and', b.LastNameAtBirth, 'is', shortest?.LastNameAtBirth || 'neither');
                        if (shortest === null) shortest = a;
                        const relation = shortest.genLen > 2 ? 'cousins' : 'siblings';
                        //console.log({ relation, genLen: shortest.genLen, timesRemoved });
                        return { relation, genLen: shortest.genLen, timesRemoved };
                    }

                    const relations = [
                        getRelation(members[0], members[1]),
                        getRelation(members[0], members[2]),
                        getRelation(members[1], members[2])
                    ];

                    const pluralRules = new Intl.PluralRules('en-US', { type: 'ordinal' });
                    const suffixes = new Map([
                        ['one', 'st'],
                        ['two', 'nd'],
                        ['few', 'rd'],
                        ['other', 'th'],
                    ]);

                    function toOrdinal(n) {
                        const rule = pluralRules.select(n);
                        const suffix = suffixes.get(rule);
                        return `${n}${suffix}`;
                    }

                    const branch = tree[branchIndex];
                    //console.log({ person, branch });
                    const testTaker = branch[0];
                    const isTestTaker = testTaker.id === person.Id;
                    const testTakerLabel = isTestTaker ? (testTaker.customName || testTaker.name) : `DNA test taker ${toTag(testTaker)}`;

                    const current = branch.find(({ id }) => id === person.Id);
                    const next = branch[branch.findIndex(({ id }) => id === current.id) + 1];

                    const cM = Number($('#centimorgans').value);
                    const chr = Number($('#chromosome').value);
                    const possessivePronoun = members[0].Gender === 'Male' ? 'his' : 'her';
                    const removeds = relations.map(({ timesRemoved }) => timesRemoved ? ` ${timesRemoved}x removed` : '');
                    const relationshipType = this.getAttribute('data-parent-gender-symbol') === '♀' ? 'Maternal' : 'Paternal';
                    const confidence = branch.indexOf(current) < branch.length - 2 ? 'confirmed by' : 'confident based on';

                    const company = $('#company').value;
                    const companyTag = {
                        'gedmatch': '[https://GEDmatch.com GEDmatch]',
                        'myheritage': '{{MyHeritageDNA}}',
                        '23andme': '{{23andMe}}'
                    }[company];

                    let confTxt = '';

                    if (company === 'gedmatch') {
                        confTxt += `${relationshipType} relationship is ${confidence} a triangulated group on ${companyTag} who share a ${cM} cM segment on chromosome ${chr}, consisting of ${members[0].tag} (GEDmatch kit # ${members[0].kit}), ${members[1].tag} (GEDmatch kit # ${members[1].kit}), ${possessivePronoun} ${toOrdinal(relations[0].genLen)} cousin${removeds[0]}, and ${members[2].tag} (GEDmatch kit # ${members[2].kit}), ${possessivePronoun} ${toOrdinal(relations[1].genLen)} cousin${removeds[1]} (${members[1].tag} and ${members[2].tag} are ${toOrdinal(relations[2].genLen)} cousins${removeds[2]}).`;
                    } else if (company === 'myheritage') {
                        confTxt += `${relationshipType} relationship is ${confidence} a triangulated group on ${companyTag} who share a ${cM} cM segment on chromosome ${chr}, consisting of ${members[0].tag}, ${members[1].tag}, ${possessivePronoun} ${toOrdinal(relations[0].genLen)} cousin${removeds[0]}, and ${members[2].tag}, ${possessivePronoun} ${toOrdinal(relations[1].genLen)} cousin${removeds[1]} (${members[1].tag} and ${members[2].tag} are ${toOrdinal(relations[2].genLen)} cousins${removeds[2]}).`;
                        confTxt += ' These matches have been independently verified by the MyHeritage Chromosome Browser.';
                    } else if (company === '23andme') {
                        confTxt += `${relationshipType} relationship is ${confidence} a triangulated group on ${companyTag} who share a ${cM} cM segment on chromosome ${chr}, consisting of ${members[0].tag}, ${members[1].tag}, ${possessivePronoun} ${toOrdinal(relations[0].genLen)} cousin${removeds[0]}, and ${members[2].tag}, ${possessivePronoun} ${toOrdinal(relations[1].genLen)} cousin${removeds[1]} (${members[1].tag} and ${members[2].tag} are ${toOrdinal(relations[2].genLen)} cousins${removeds[2]}).`;
                    }

                    confTxt += ` Their common ancestor is [[${MRCA.idStr}|${MRCA.name}]], the ${members[0].gx}x great grandparent of ${members[0].tag}, ${members[1].gx}x great grandparent of ${members[1].tag}, and ${members[2].gx}x great grandparent of ${members[2].tag}.`;

                    confTxt += ' ' + testTakerLabel;

                    if (isTestTaker) {
                        const rel = toRel(branch[1].id, branch[branch.length - 1].id, branch);
                        confTxt += ` is the ${testTaker.childLabel} of ${toTag(branch[1])} who is the ${rel} of the common ancestor ${toTag(MRCA)}.`
                    } else {
                        const rel1 = toRel(testTaker.id, current.id, branch);
                        const rel2 = toRel(current.id, next.id, branch);
                        const rel3 = toRel(next.id, branch[branch.length - 1].id, branch);

                        if (rel3 === null) {
                            confTxt += ` is the ${rel1} of ${toTag(current)}, the ${rel2} of the common ancestor ${toTag(MRCA)}.`;
                        } else {
                            confTxt += ` is the ${rel1} of ${toTag(current)}, the ${rel2} of ${toTag(next)}, the ${rel3} of the common ancestor ${toTag(MRCA)}.`;
                        }
                    }

                    console.log(confTxt);

                    navigator.clipboard.writeText(confTxt);

                    /*const wikiTable = makeWikiTable();
                    console.log(wikiTable);

                    navigator.clipboard.writeText(text + '\n' + wikiTable);*/
                });
            });
        }
    }

    $('#common-ancestors').dispatchEvent(new Event('change'));
    $('#trees').dispatchEvent(new Event('change'));

    this.disabled = false;
    $('#common-ancestors').disabled = false;
    $('#trees').disabled = false;
});

function prettifyPerson(person) {
    const { customName, Id, Name, Gender, FirstName, MiddleName, LastNameAtBirth, LastNameCurrent, BirthDateDecade, DeathDateDecade, IsLiving } = person;
    const genderSymbol = Gender === 'Male' ? '♂' : '♀';
    const fullName = [
        FirstName || '',
        MiddleName || '',
        LastNameAtBirth !== LastNameCurrent ? '(' + LastNameAtBirth + ')' : '',
        LastNameCurrent || '',
    ].join(' ').replace(/ +/g, ' ').trim();
    const timespan = [
        BirthDateDecade,
        '-',
        IsLiving ? 'living' : DeathDateDecade
    ].join('').replace(/ +/g, ' ');
    const label = genderSymbol + ' ' + fullName + ' ' + timespan + '';
    return { customName, name: fullName, label, genderSymbol, timespan };
}

/*async function DNAngulate(ids) {
    //const resp = await fetch('https://dnangulator.deno.dev/api?ids=' + ids.join(','));
    //const resp = await fetch('/api?ids=' + ids.join(','));
    if (resp.status !== 200) {
        alert(resp.statusText || 'There was an error.');
        console.error(resp.statusText);

        $('#dnangulate').disabled = false;
        $('#common-ancestors').disabled = false;
        $('#trees').disabled = false;
    }
    const json = await resp.json();
    return json;
}*/

$('#number').addEventListener('input', function () {
    const targetCount = Math.max(2, Number(this.value));
    const currentCount = $$('.profile').length;
    if (targetCount > currentCount) {
        for (let i = currentCount; i < targetCount; i++) {
            const div = document.createElement('div');
            div.classList.add('profile');

            const input = document.createElement('input');
            input.classList.add('first-name');
            input.placeholder = 'First Name #' + (i + 1);
            div.appendChild(input);

            div.innerHTML += '\n';

            const input2 = document.createElement('input');
            input2.classList.add('id');
            input2.placeholder = 'Profile ID #' + (i + 1);
            div.appendChild(input2);

            div.innerHTML += '\n';

            const input3 = document.createElement('input');
            input3.classList.add('gedmatch');
            input3.placeholder = 'GEDmatch Kit #' + (i + 1);
            div.appendChild(input3);

            $('.profile-ids').appendChild(div);
        }
    } else if (targetCount < currentCount) {
        while (targetCount < $$('.profile').length) {
            $('.profile:last-of-type').remove();
        }
    }
});

$('#company').addEventListener('change', function () {
    $('body').setAttribute('data-company', this.value);
    const ids = $$('.id').map(({ value }) => value);
    const kits = $$('.gedmatch').map(({ value }) => value);
    updateURL(ids, kits, this.value);
});

function addBadge(td) {
    const a = document.createElement('a');
    td.appendChild(a);
    a.classList.add('badge');
    const img = document.createElement('img');
    a.appendChild(img);
    img.src = 'dna-confirmation-badge.gif';
    img.width = 38;
    img.height = 12;
    img.setAttribute('title', 'Copy confirmation text to clipboard');
    a.addEventListener('click', function () {
        this.classList.add('clicked');
    });
    return a;
}

const PROFILE_IDS = new URLSearchParams(location.search).get('ids')?.split(',');
if (PROFILE_IDS) {
    $('#number').value = PROFILE_IDS.length;
    $('#number').dispatchEvent(new Event('input'));
    PROFILE_IDS.forEach((id, i) => $$('.id')[i].value = id);
}

const KIT_IDS = new URLSearchParams(location.search).get('kits')?.split(',');
if (KIT_IDS) {
    KIT_IDS.forEach((kit, i) => $$('.gedmatch')[i].value = kit);
}

const COMPANY = new URLSearchParams(location.search).get('company');
if (COMPANY) {
    $('#company').value = COMPANY;
    $('body').setAttribute('data-company', COMPANY);
}

function updateURL(ids, kits, company) {
    const newURL = `${location.pathname}?ids=${ids.join(',')}&kits=${kits.join(',')}&company=${company}`;
    history.pushState(null, '', newURL);
    $('body').setAttribute('data-company', company);
}

function makeWikiTable() {
    const ancId = $('tr a').getAttribute('href').split('/').toReversed()[0];
    const ancLabel = $('tr a').textContent;
    const ancGender = $('tr span').textContent;
    const ancAge = $('tr span:last-of-type').textContent;

    const rows = $$('tr').slice(1).map(tr => {
        const tds = [...tr.querySelectorAll('td')];
        return tds.map(td => {
            let id = td?.querySelector('a')?.getAttribute('href')?.split('/')?.toReversed()?.[0];
            if (id == 'undefined') id = null;
            const label = td?.querySelector('a')?.textContent;
            if (!label) return null;
            const gender = td?.querySelector('span')?.textContent;
            const age = td?.querySelector('span:last-of-type')?.textContent;
            return { id, label, gender, age };
        });
    });

    return `{|\n|+${ancGender} [[${ancId}|${ancLabel}]] (${ancAge})\n|` + rows.map(row => {
        return row.map(cell => {
            return cell
                ? `${cell.gender} ${cell.id
                    ? `[[${cell.id}|${cell.label}]] (${cell.age})`
                    : `${cell.label} (${cell.age})`}`
                : '';
        }).join('||');
    }).join('\n|-\n|') + '\n|-\n|}';
}

function toRel(idA, idB, branch) {
    const pA = branch.find(({ id }) => id === idA);
    const pB = branch.find(({ id }) => id === idB);
    const indexA = branch.findIndex(({ id }) => id === idA);
    const indexB = branch.findIndex(({ id }) => id === idB);
    const distance = Math.abs(indexA - indexB);
    let rel = null;
    const { childLabel } = pA;
    if (distance === 1) rel = childLabel;
    if (distance === 2) rel = `grand${childLabel}`;
    if (distance === 3) rel = `great grand${childLabel}`;
    if (distance > 3) rel = `${distance - 2}x great grand${childLabel}`;
    return rel;
}

function toTag(branchMember) {
    return `[[${branchMember.idStr}|${branchMember.customName || branchMember.name}]]`;
}