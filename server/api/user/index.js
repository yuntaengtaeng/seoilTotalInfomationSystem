const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const app = express();
const utils = require('../../utils');
const { ERROR_CODE } = require('../../errors');

const db = new sqlite3.Database('db/main.db', (err) => {
    if (err) {
        console.error(err.message);
    };
});

const checkId = id => {
    if (100000000 < id && id < 999999999)
        return 'student';
    else
        return 'professor';
}

const getId = session => {
    return new Promise((resolve, reject) => {
        db.get(`select id from account
                where session = "${session}"`,
            [], (err, row) => {
                if (err) {
                    reject(ERROR_CODE[500]);
                }
                if (!Object.keys(row).length) {
                    reject(ERROR_CODE[400])
                }
                resolve(row);
            });
    });
};

const getSimpleUserInfo = (tableName, id) => {
    return new Promise((resolve, reject) => {
        db.get(`select id,${tableName}.name as name,dept.name as deptName from ${tableName}
                inner join dept
                on ${tableName}.department = dept.code
                where id = ${id}`,
            (err, row) => {
                if (err) {
                    reject(ERROR_CODE[500]);
                }
                if (!row) {
                    reject(ERROR_CODE[400])
                }
                resolve(row);
            });
    });
};

const insertStudent = (studentInfo) => {
    const sql = `insert into student(${Object.keys(studentInfo).join(',')}) values(${Object.values(studentInfo).map(v => isNaN(v) ? `"${v}"` : v)})`;
    return new Promise((resolve, reject) => {
        db.run(sql,
            function (err) {
                if (err) {
                    reject(ERROR_CODE[500]);
                }
                resolve(this.lastID);
            });
    });
};

const insertProfessor = (professorInfo) => {
    const sql = `insert into professor(${Object.keys(professorInfo).join(',')}) values(${Object.values(professorInfo).map(v => isNaN(v) ? `"${v}"` : v)})`;
    return new Promise((resolve, reject) => {
        db.run(sql,
            function (err) {
                if (err) {
                    reject(ERROR_CODE[500]);
                }
                resolve(this.lastID);
            });
    });
};

const generateStudentAccount = (accountInfo) => {
    return new Promise((resolve, reject) => {
        db.run(`insert into account(id,password) values(${accountInfo.id},"${accountInfo.password}")`,
            (err) => {
                if (err) {
                    reject(ERROR_CODE[500]);
                }
                resolve(true);
            });
    });
};

app.get('/simple', (req, res) => {
    const cookie = req.headers.cookie;
    const session = utils.getSession(cookie);

    getId(session)
        .then(user => {
            return getSimpleUserInfo(checkId(user.id), user.id);
        })
        .then(userInfo => {
            res.status(200).json(userInfo);
        })
        .catch(failed => {
            res.status(failed.code).json(failed.message);
        })
});

app.post('/student', (req, res) => {
    const body = req.body;

    if (!utils.checkRequiredProperties(['id', 'name', 'birthday', 'sex', 'department', 'email', 'phone_num', 'address', 'gurdian_id', 'is_break'], body)) {
        res.status(400).json(ERROR_CODE(400).message);
    }

    insertStudent(body)
        .then(rowid => {
            return generateStudentAccount({ id: rowid, password: body.birthday.split('/').join('') });
        })
        .then(ignore => {
            res.status(200).json({ insert: true });
        })
        .catch(failed => {
            res.status(failed.code).json(failed.message);
        })
});

app.post('/professor', (req, res) => {
    const body = req.body;

    if (!utils.checkRequiredProperties(['id', 'name', 'birthday', 'sex', 'department', 'email', 'phone_num', 'address'], body)) {
        res.status(400).json(ERROR_CODE(400).message);
    }

    insertProfessor(body)
        .then(rowid => {
            return generateStudentAccount({ id: rowid, password: body.birthday.split('/').join('') });
        })
        .then(ignore => {
            res.status(200).json({ insert: true });
        })
        .catch(failed => {
            res.status(failed.code).json(failed.message);
        })
});

module.exports = app;