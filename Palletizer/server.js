const folder = process.argv[2];
const index = process.argv[3];
const express = require('express');
const app = express();
const path = require('path');
const port = 3010;
const staticPath = path.join(__dirname, `../${folder}`);
const cors = require('cors');

app.use(cors());
app.use(express.static(`${staticPath}`));


app.get('/', (req, res) => res.sendFile(`${staticPath}/${index || 'index.html'}`));

app.listen(port, () => console.log(`server running on port ${port}`));
