import https from 'https';

const options = {
  hostname: 'exercisedb.p.rapidapi.com',
  path: '/exercises?limit=3',
  method: 'GET',
  headers: {
    'x-rapidapi-host': 'exercisedb.p.rapidapi.com',
    'x-rapidapi-key': '397fd16e6cmsh30275d0e8278839p1cdb31jsn626e0dc5bd1e'
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (d) => {
    data += d;
  });
  res.on('end', () => {
    console.log(data);
  });
});

req.on('error', (error) => {
  console.error(error);
});

req.end();
