const { createPool } = require('mysql');
const express = require('express');
const imeiToObject = {}; // Define imeiToObject at a higher scope

const bodyParser = require('body-parser'); // Import body-parser
const app = express();
const port = 3000;
const pool = createPool({
    host: 'database-1.cxvimxaxcei9.ap-south-1.rds.amazonaws.com',
    user: 'admin',
    password: 'ingo1234',
    database: 'ingodata',
    connectionLimit: 10
});
const fs = require('fs');
const path = require('path');

const getTableNamesQuery = "SELECT TABLE_NAME FROM information_schema.TABLES WHERE table_schema = 'ingodata';";
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

app.get('/getTableNames', (req, res) => {
    pool.query(getTableNamesQuery, (err, results) => {
        if (err) {
            console.error('Error fetching table names:', err);
            return res.status(500).json({ error: 'Error fetching table names' });
        }
        const tableNames = results.map((row) => row.TABLE_NAME);
        res.json({ tableNames });
    });
});
app.post('/fetch-data', (req, res) => {
    const selectedTable = req.body.table;

    const dateTimeRange = req.body.dateTimeRange;
    const [fromDateTime, toDateTime] = dateTimeRange.split(' - ');
    const fromDateTimeObj = new Date(fromDateTime);
    const toDateTimeObj = new Date(toDateTime);
    const fromDateTimeSQL = fromDateTimeObj.toISOString().slice(0, 19).replace('T', ' ');
    const toDateTimeSQL = toDateTimeObj.toISOString().slice(0, 19).replace('T', ' ');
    const fetchDataQuery = `SELECT * FROM \`${selectedTable}\`WHERE date_time BETWEEN STR_TO_DATE(?, '%Y-%m-%d %H:%i:%s') AND STR_TO_DATE(?, '%Y-%m-%d %H:%i:%s');
    `;
    pool.query(fetchDataQuery, [fromDateTimeObj, toDateTimeObj], (err, results) => {
        if (err) {
            console.error(`Error fetching data from ${selectedTable}:`, err);
            return res.status(500).send(`Error fetching data from ${selectedTable}`);
        }
        // Check if there are rows in the results
        if (!results || results.length === 0) {
            // Handle the case when no data is found
            const noDataHtml = `
            <!DOCTYPE html>
            <html>
            <head>
    <title>No Data Found</title>
    <style>
        body {
            font-family: Arial, sans-serif; /* Set the font family */
            background-color: #f0f0f0; /* Set the background color */
            text-align: center; /* Center-align text */
        }

        h1 {
            color: #333; /* Set text color */
            font-size: 24px; /* Set font size */
        }
    </style>
</head>
<body>
    <h1>No data found for the selected date range.</h1>
</body>
            </html>
            `;
            // Send the "noDataHtml" directly if no data is found
            return res.send(noDataHtml);
        }
        let totalDistance = 0;
        const data = results;
        let onToOffCount = 0;
         for (let i = 0; i < data.length - 1; i++) {
               if (data[i]['IGN'] === 'ON' && data[i + 1]['IGN'] === 'OFF') {
          onToOffCount++;
            }
           }
        let offToOnCount = 0;
          for (let i = 0; i < data.length - 1; i++) {
                if (data[i]['IGN'] === 'OFF' && data[i + 1]['IGN'] === 'ON') {
            offToOnCount++;
            }
           }
           let sumOfAverageVoltage = 0;
           let filteredDataLength = 0;

           for (let i = 0; i < data.length; i++) {
            if (data[i]['IGN'] === 'ON' && data[i]['Speed'] > 1) {
                sumOfAverageVoltage += data[i]['External Voltage'];
                filteredDataLength++;
                avgvoltage = (sumOfAverageVoltage/filteredDataLength).toFixed(2);

               }
           }
let avgonhours = 0;

for (let i = 0; i < data.length - 1; i++) {
    if (data[i]['IGN'] === 'ON' && data[i + 1]['IGN'] === 'OFF') {
        // Calculate the time difference between the current and next rows
        const currentTime = new Date(data[i]['date_time']);
        const nextTime = new Date(data[i + 1]['date_time']);
        const timeDifference = (nextTime - currentTime) / 3600000; // Convert milliseconds to hours
        avgonhours += timeDifference;

    }
}


const roundedAvgonhours = avgonhours.toFixed(2);

console.log(roundedAvgonhours);
let avgoffhours = 0;

for (let i=0; i<data.length - 1; i++) {
    if(data[i]['IGN'] === 'OFF' && data[i+1]['IGN'] === 'ON') {
        const currentTime = new Date(data[i]['date_time']);
        const nextTime = new Date(data[i+1]['date_time']);
        const timeDifference = (nextTime - currentTime) / 3600000;
        avgoffhours +=timeDifference;
    }
}

const roundedAvgoffhours = avgoffhours.toFixed(2);
console.log("Sum of External Voltage:", sumOfAverageVoltage);
           console.log("Length of Filtered Data:", filteredDataLength);
           console.log("avg voltage", avgvoltage)
        const avgKmByDate = {};
        data.forEach((row)=> {
            if (row['IGN'] !== 'OM') {
                const currentDate = new Date(row['date_time']); // Assuming 'date_time' is the date column name
                const currentavgkm = row['Last Distance (meters)'];
                const formattedDate = currentDate.toISOString().split('T')[0];
                if (!avgKmByDate[formattedDate]) {
                    avgKmByDate[formattedDate] = [];
                }
                avgKmByDate[formattedDate].push(currentavgkm);
            }
        });
        const avgKmData = Object.keys(avgKmByDate).map((date) =>{
        const kms       = avgKmByDate[date];
        const sumKms    = kms.reduce((acc, km) => acc + km, 0);
        const averageKm = (sumKms*0.001);

        return {
            date,
            averageKm,
        };
    });
    const groupedData = {};
data.forEach((row) => {
    if (row['IGN'] !== 'OM') {
        const currentDate = new Date(row['date_time']);
        const formattedDate = currentDate.toISOString().split('T')[0];
        const dayOfWeek = currentDate.getDay(); // 0 (Sunday) to 6 (Saturday)
        const hour = currentDate.getHours();

        if (!groupedData[formattedDate]) {
            groupedData[formattedDate] = {};
        }

        if (!groupedData[formattedDate][hour]) {
            groupedData[formattedDate][hour] = {
                totalKm: 0,
                count: 0,
            };
        }

        groupedData[formattedDate][hour].totalKm += row['Last Distance (meters)'];
        groupedData[formattedDate][hour].count++;
    }
});

// Calculate the average kilometers for each day and hour
const avgKmByDayAndHour = {};
for (const date in groupedData) {
    avgKmByDayAndHour[date] = [];
    for (let hour = 0; hour < 24; hour++) {
        if (groupedData[date][hour]) {
            const avgKm = groupedData[date][hour].totalKm * 0.001;
            avgKmByDayAndHour[date].push({ hour, avgKm });
        } else {
            avgKmByDayAndHour[date].push({ hour, avgKm: 0 });
        }
    }
}
const avgKmByDayAndHourJSON = JSON.stringify(avgKmByDayAndHour);
    
    const sumOfAverageKms = avgKmData.reduce((acc, dataPoint) => acc + dataPoint.averageKm, 0);
    const numberOfDays = avgKmData.length;
    const averageKmPerDay = (sumOfAverageKms / numberOfDays).toFixed(2);
        const maxSpeedByDate = {};
        data.forEach((row) => {
            if (row['IGN'] === 'ON' && row['Speed'] <= 35) {
                const currentDate = new Date(row['date_time']); // Assuming 'date_time' is the date column name
                const currentSpeed = row['Speed'];
                        const formattedDate = currentDate.toISOString().split('T')[0];
                    if (!maxSpeedByDate[formattedDate] || currentSpeed > maxSpeedByDate[formattedDate]) {
                    maxSpeedByDate[formattedDate] = currentSpeed;
                }
            }
        });
        const maxSpeedData = Object.keys(maxSpeedByDate).map((date) => ({
            date,
            speed: maxSpeedByDate[date],
        }));
        const maxSpeedData1 = maxSpeedData;
          const maxSpeedByDate1 = {};
          
          maxSpeedData1.forEach((entry) => {
            maxSpeedByDate1[entry.date] = entry.speed;
          });
          
          const maxSpeedDataJSON1 = JSON.stringify(maxSpeedByDate1);
          const maxSpeedDataJSON = JSON.stringify(maxSpeedData);
        const avgSpeedByDate ={};
        data.forEach((row) => {
            if (row['IGN'] === 'ON' && row['Speed'] !== 0) {
                const currentDate = new Date(row['date_time']); // Assuming 'date_time' is the date column name
                const currentSpeed = row['Speed'];
                        const formattedDate = currentDate.toISOString().split('T')[0];
                if (!avgSpeedByDate[formattedDate]) {
                    avgSpeedByDate[formattedDate] = [];
                }
        
                // Add the current speed to the array for the current date
                avgSpeedByDate[formattedDate].push(currentSpeed);
            }
        });
            const avgSpeedData = Object.keys(avgSpeedByDate).map((date) => {
            const speeds = avgSpeedByDate[date];
            const sumSpeed = speeds.reduce((acc, speed) => acc + speed, 0);
            const averageSpeed = (sumSpeed / speeds.length).toFixed(2); // Limit to 2 decimal places
            
            return {
                date,
                averageSpeed,
            };
        });
       
        const avgSpeedDataJSON = JSON.stringify(avgSpeedData);
        const avgSpeedDataJSON1 = avgSpeedDataJSON;

        const avgSpeedDataArray = JSON.parse(avgSpeedDataJSON1); // Parse the JSON string into an array
        const avgSpeedDataObject = {};

        avgSpeedDataArray.forEach((entry) => {
        avgSpeedDataObject[entry.date] = parseFloat(entry.averageSpeed);
        });
        const avgSpeedDataMergedJSON = JSON.stringify(avgSpeedDataObject);
        const htmlTemplatePath = path.join(__dirname, 'public', 'result.html');
        fs.readFile(htmlTemplatePath, 'utf8', (err, template) => {
            if (err) {
                console.error('Error reading template file:', err);
                return res.status(500).send('Error reading template file');
            }        
                const renderedHtml = template
                .replace('{{selectedTable}}', selectedTable)
                .replace('{{avgvoltage}}', avgvoltage)
                .replace('{{roundedAvgonhours}}', roundedAvgonhours)
                .replace('{{roundedAvgoffhours}}', roundedAvgoffhours)
                .replace('{{fromDateTimeObj}}', fromDateTimeObj)
                .replace('{{toDateTimeObj}}', toDateTimeObj)
                .replace('{{averageKmPerDay}}', averageKmPerDay)
                .replace('{{onToOffCount}}', onToOffCount)
                .replace('{{offToOnCount}}', offToOnCount)
                .replace('{{maxSpeedDataJSON1}}',maxSpeedDataJSON1)
                .replace('{{avgSpeedDataMergedJSON}}',avgSpeedDataMergedJSON)
                .replace('{{avgKmByDayAndHourJSON}}',avgKmByDayAndHourJSON)
                .replace('{{imeiToObject}}',imeiToObject);
                res.send(renderedHtml);
        });
    });
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
