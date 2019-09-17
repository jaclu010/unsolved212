import React, { useState } from 'react';
import { Box, Grommet, TextInput, Button } from 'grommet';
import axios from 'axios';
import moment from 'moment'
import haversine from 'haversine';

const TOKEN = process.env.TOKEN;
const MINUTE_DELTA = '15';
const DISTANCE = 10000;

const theme = {
  global: {
    font: {
      family: 'Roboto',
      size: '14px',
      height: '20px',
    },
  },
};

const AppBar = (props) => (
  <Box
    tag='header'
    direction='row'
    align='center'
    justify='between'
    background='brand'
    pad={{ left: 'medium', right: 'small', vertical: 'small' }}
    elevation='medium'
    style={{ zIndex: '1' }}
    {...props}
  />
);

const NumberInput = (props) => {
  return (
    <TextInput
      placeholder="type here"
      value={props.value}
      onChange={props.handler}
    />
  );
}

const toDateFormat = dateString => `${dateString.slice(0, 4)}-${dateString.slice(4, 6)}-${dateString.slice(6, 8)}:${dateString.slice(8, 10)}:${dateString.slice(10, 12)}`;

async function queryForWeather() {
  const { data: mostRecentData } = await axios({
    method: 'get',
    url: `https://demo-apim.westeurope.cloudapp.azure.com/api_secure/PrecipitationAPI/3.0.0/weather/precipitation/availability?location=stockholm`,
    headers: { Authorization: TOKEN }
  }).catch(console.error);

  const toAnalysePromises = [];
  const timeToTry = moment(new Date(toDateFormat(mostRecentData.maxTime)));
  
  for (let i = 0; i < 3; i++) {
    toAnalysePromises.push(
      axios({
        method: 'get',
        url: `https://demo-apim.westeurope.cloudapp.azure.com/api_secure/PrecipitationAPI/3.0.0/weather/precipitation/at/${timeToTry.format("YYYYMMDDHHmm")}?location=stockholm`,
        headers: { Authorization: TOKEN }
      }).catch(console.error)
    );

    timeToTry.subtract(MINUTE_DELTA, 'minutes');
  }

  const toAnalyse = await Promise.all(toAnalysePromises);

  const averages = toAnalyse.map(({ data }) => {
    const userLocation = {
      latitude: 59.3293,
      longitude: 18.0686,
    }
    
    const points = data.points.filter(({ geometry }) => {
      const [longitude, latitude] = geometry.coordinates;
      const distance = haversine(userLocation, { latitude, longitude }, { unit: 'meter' });

      return distance < DISTANCE;
    });

    const avg = points.reduce((reduced, { properties }) =>  reduced + properties.value, 0) / points.length;

    return avg;
  });

  
   return averages[0] + (averages[0] - averages[averages.length - 1]);
}


const renderResult = prediction => {
  let result;
  
  if (prediction <= 0) {
    result = 'Its not going to rain';
  } else if (prediction < 0.5) {
    result = 'There may be a drop or two'
  } else if (prediction < 1) {
    result = 'Light raing';
  } else if (prediction < 4) {
    result = 'Bring an umbrella';
  } else {
    result = 'Cars will be floating';
  }

  return (
    <>
      <h2>In 30 minutes ...</h2>
      <p>
        {result}
      </p>
      <h2>with 0.5% certainty</h2>
    </>
  );
};

function App() {
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [descision, setDescision] = useState(null);

  return (
    <Grommet theme={theme}>
      <AppBar>
         Hello
      </AppBar>
      <NumberInput
        value={lat}
        handler={({ target }) => setLat(target.value)}
      />
      <NumberInput
        value={lng}
        handler={({ target }) => setLng(target.value)}
      />
      <Button
        onClick={() => queryForWeather().then(setDescision)}
        label="Get prediction"
      />
      {(descision || descision === 0) && renderResult(descision)}
    </Grommet>
  );
}

export default App;
