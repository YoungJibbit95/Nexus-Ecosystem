import https from 'https';

https.get('https://raw.githubusercontent.com/YoungJibbit95/Nexus-Ecosystem/main/README.md', (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log(data);
  });
}).on('error', (err) => {
  console.log('Error: ' + err.message);
});
