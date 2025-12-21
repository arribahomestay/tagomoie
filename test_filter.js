const http = require('http');

function getReports(deptId) {
    const url = `http://localhost:3000/api/reports?department_id=${deptId}`;
    console.log(`Fetching: ${url}`);

    http.get(url, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            const reports = JSON.parse(data);
            console.log(`Reports found for Dept ${deptId}: ${reports.length}`);
            reports.forEach(r => console.log(` - [${r.department}] ${r.name} (DeptID in DB might be hidden here)`));
        });
    }).on('error', err => console.error(err));
}

// Test for Department 6 (Health) which should see NOTHING based on debug data (reports are 1 and 4)
getReports(6);

// Test for Department 1 (Engineering) which should see 2 reports
getReports(1);

// Test for no filter (Super Admin?)
getReports('');
