const DEPTH = 10;

export async function DNAngulate(...ids) {
    const persons = await Promise.all(ids.map(downloadPerson));
    const commonAncestors = identifyCommonAncestors(persons);
    persons.forEach(person => person.paths = computePaths(person));
    persons.forEach(person => {
        person.paths = person.paths.filter(path => {
            return filterByAncestors(path, commonAncestors);
        });
    });
    persons.forEach(person => {
        person.paths = commonAncestors.reduce((paths, commonAncestor) => {
            paths[commonAncestor.Id] = person.paths.filter(path => {
                return path.includes(commonAncestor.Id);
            }).map(path => {
                const index = path.indexOf(commonAncestor.Id);
                return path.slice(0, index + 1);
            });
            paths[commonAncestor.Id] = [...new Set(
                paths[commonAncestor.Id].map(path => JSON.stringify(path))
            )].map(path => JSON.parse(path));
            return paths;
        }, {});
    });
    const pathCombos =
        Object.entries(findPathCombos(persons, commonAncestors))
            .sort((a, b) => {
                const minGenLenA = Math.min(...a[1].map(array => array.reduce((sum, array) => sum + array.length, 0)));
                const minGenLenB = Math.min(...b[1].map(array => array.reduce((sum, array) => sum + array.length, 0)));
                return minGenLenA - minGenLenB;
            })
    const triangulations = formatPathCombos(pathCombos, persons);
    return triangulations;
}

async function downloadPerson(key) {
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
        'Id',
        'Key'
    ];
    const url = `https://api.wikitree.com/api.php?action=getAncestors&key=${key}&depth=${DEPTH}&fields=${fields}&resolveRedirect=1&appId=DNAngulator`;
    const resp = await fetch(url);
    const json = await resp.json();
    const [person, ...ancestors] = json[0].ancestors;

    console.log(key, DEPTH, 'DEPTH', json[0].ancestors.length - 1);
    return addChildren([person, ...ancestors]);
}

function addChildren(persons) {
    persons.forEach(person => person.children = []);
    persons.forEach(person => {
        const father = persons.find(({ Id }) => Id === person.Father);
        const mother = persons.find(({ Id }) => Id === person.Mother);
        father?.children.push(person.Id);
        mother?.children.push(person.Id);
    });

    // replace all predictable negative IDs with something unique to avoid clashes between anon profiles
    persons.forEach(person => {
        const { Id } = person;
        if (Id < 0 && Id > -999) {
            const newId = -Number((Math.random() * 100_000 + 100_000).toFixed(0));
            persons.forEach(p => {
                if (p.Id === Id) p.Id = newId;
                if (p.Father === Id) p.Father = newId;
                if (p.Mother === Id) p.Mother = newId;
                if (p.children.includes(Id)) {
                    p.children = p.children.map(id => id === Id ? newId : id);
                }
            });
        }
    });

    // assign surname of father to unnamed persons
    persons.forEach(person => {
        if (!person.LastNameAtBirth) {
            const father = persons.find(({ Id }) => Id === person.Father);
            if (father) {
                person.LastNameAtBirth = father.LastNameAtBirth;
            }
        }
    });

    // assign genders to anon parents 
    persons.forEach(person => {
        const father = persons.find(({ Id }) => Id === person.Father);
        const mother = persons.find(({ Id }) => Id === person.Mother);
        if (father && !father.Gender) father.Gender = 'Male';
        if (mother && !mother.Gender) mother.Gender = 'Female';
    });

    return {
        ...persons[0],
        ancestors: persons.slice(1)
    };
}

function identifyCommonAncestors(persons) {
    const commonAncestors = persons[0].ancestors.filter(ancestor => {
        for (const { ancestors } of persons.slice(1)) {
            if (!ancestors.find(({ Id }) => Id === ancestor.Id)) {
                return false;
            }
        }
        return true;
    });
    console.log(commonAncestors.length, 'common ancestors');
    return commonAncestors;
}

function computePaths(person) {
    const { ancestors } = person;
    const paths = [];
    for (let i = 0; i <= parseInt('1'.repeat(DEPTH), 2); i++) {
        const binary = i.toString(2).padStart(DEPTH, '0');
        const path = [person.Id];
        for (const digit of binary) {
            const father = !!Number(digit);
            const idx = path.length === 1 ? 0 : path.length - 1;
            const ancestor = idx ? ancestors.find(({ Id }) => Id === path[idx]) : person;
            if (!ancestor) {
                break;
            } else {
                const parent = father ? ancestor.Father : ancestor.Mother;
                if (parent) {
                    path.push(parent);
                } else {
                    break;
                }
            }
        }
        if (!paths.some(p => p.toString() === path.toString())) {
            paths.push(path);
        }
    }
    return paths;
}

function filterByAncestors(path, commonAncestors) {
    return commonAncestors.find(({ Id }) => path.includes(Id));
}

function findPathCombos(persons, commonAncestors) {
    const pathCombos = {};
    for (const ancestor of commonAncestors) {
        pathCombos[ancestor.Id] = [];
        const max = parseInt('9'.repeat(persons.length));
        for (let number = 0; number <= max; number++) {
            const serial = String(number).padStart(persons.length, '0');
            const indices = serial.split('').map(Number);
            const combo = persons.map(({ paths }, i) => {
                const path = paths[ancestor.Id][indices[i]];
                if (!path) return null;
                return path;
            });
            if (!combo.includes(null)) {
                combo.sort((a, b) => a.length - b.length);
                combo.avgGenLen = combo.reduce((avgGenLen, { length }) => avgGenLen + length, 0) / combo.length;
                combo.minGenLen = Math.min(...combo.map(({ length }) => length));
                pathCombos[ancestor.Id].push(combo);
            }
        }
        pathCombos[ancestor.Id].sort((a, b) => a.avgGenLen - b.avgGenLen);
    }
    return pathCombos;
}

function formatPathCombos(pathCombos, persons) {
    const allPersons = [
        ...persons,
        ...persons.map(({ ancestors }) => ancestors)
    ].flat(1).map(person => {
        const { Id, Key, Gender, FirstName, MiddleName, LastNameAtBirth, LastNameCurrent, BirthDateDecade, DeathDateDecade, IsLiving } = person;
        return { Id, Key, Gender, FirstName, MiddleName, LastNameAtBirth, LastNameCurrent, BirthDateDecade, DeathDateDecade, IsLiving };
    });

    const triangulations = pathCombos.map(([k, v]) => {
        return [
            Number(k),//prettifyId(Number(k), allPersons),
            //v.map(a => a.map(array => array.length))
            //v.map(a => a.map(v => v.map(id => prettifyId(id, allPersons))))
            v
        ];
    });
    return { triangulations, allPersons };
}

function prettifyId(id, persons) {
    const person = persons.find(({ Id }) => {
        const found = +Id == +id;
        if (found) return true;
    });
    if (!person) return '[Unknown]';
    const { Id, Key, Gender, FirstName, MiddleName, LastNameAtBirth, LastNameCurrent, BirthDateDecade, DeathDateDecade, IsLiving } = person;
    let name = '[' + Id + ']' + ' ' + Key + ' ' + '[' + Gender[0] + ']' + ' ' + (FirstName || '[Anonymous]') + ' ' + MiddleName + ' ' + '(' + LastNameAtBirth + ')' + ' ' + LastNameCurrent + ' (' + BirthDateDecade + ' - ' + (IsLiving ? '[Living]' : DeathDateDecade ? DeathDateDecade : '[Unknown]') + ')';
    name = name.replace(/undefined ?/g, '').replace(/ +/g, ' ').replace(/unknown/g, '[Unknown]');
    return name;
}