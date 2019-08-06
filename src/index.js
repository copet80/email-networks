import React from 'react';
import ReactDOM from 'react-dom';
import classNames from 'classnames';
import { makeStyles } from '@material-ui/core/styles';
import AppBar from '@material-ui/core/AppBar';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import Toolbar from '@material-ui/core/Toolbar';
import FormControl from '@material-ui/core/FormControl';
import InputLabel from '@material-ui/core/InputLabel';
import Select from '@material-ui/core/Select';
import MenuItem from '@material-ui/core/MenuItem';

import './styles.css';
import { generateRandomData } from './dummyData.js';
import RelationshipGraph from './components/RelationshipGraph';
import DegreeGraph from './components/DegreeGraph';
import InfluenceGraph from './components/InfluenceGraph';
import ActivityGraph from './components/ActivityGraph';

const useStyles = makeStyles((theme) => ({
  root: {
    flexGrow: 1,
    backgroundColor: theme.palette.background.paper,
  },
  toolbar: {
    minHeight: 0,
    paddingLeft: 0,
    paddingRight: 10,
  },
  tabs: {
    flexGrow: 1,
  },
}));

function filterByReferrer(fullData, referrer) {
  const referrers = {};
  fullData.forEach((item) => {
    if (item.referrer === referrer) {
      referrers[item.referrer] = true;
      referrers[item.referral1] = true;
      referrers[item.referral2] = true;
    }
  });
  return fullData.filter((item) => {
    return !!referrers[item.referrer];
  });
}

function App() {
  const rawData = generateRandomData();
  const emailsMap = {};
  rawData.forEach((item) => {
    emailsMap[item.referrer] = true;
    emailsMap[item.referral1] = true;
    emailsMap[item.referral2] = true;
  });
  const emails = Object.keys(emailsMap).sort();
  const email = emails[0];

  const [values, setValues] = React.useState({
    selectedTabIndex: 0,
    email,
    data: filterByReferrer(rawData, email),
  });

  const classes = useStyles();

  function handleTabChange(event, tabIndex) {
    setValues((oldValues) => ({
      ...oldValues,
      selectedTabIndex: tabIndex,
    }));
  }

  function handleEmailChange(event) {
    const email = event.target.value;
    setValues((oldValues) => ({
      ...oldValues,
      email,
      data: filterByReferrer(rawData, email),
    }));
  }

  return (
    <div className={classNames('App', classes.root)}>
      <AppBar position="static" color="default">
        <Toolbar className={classes.toolbar}>
          <Tabs
            className={classes.tabs}
            value={values.selectedTabIndex}
            onChange={handleTabChange}>
            <Tab label="Relationship" />
            <Tab label="Degree" />
            <Tab label="Influence" />
            <Tab label="Activity" />
          </Tabs>
          <FormControl className="emailSelector">
            <InputLabel htmlFor="email">Email</InputLabel>
            <Select
              value={values.email}
              onChange={handleEmailChange}
              inputProps={{
                name: 'email',
                id: 'email',
              }}>
              {emails.map((email) => (
                <MenuItem key={email} value={email}>
                  {email}
                </MenuItem>
              ))}
              ;
            </Select>
          </FormControl>
        </Toolbar>
      </AppBar>
      {values.selectedTabIndex === 0 && (
        <RelationshipGraph data={values.data} />
      )}
      {values.selectedTabIndex === 1 && (
        <DegreeGraph data={values.data} email={values.email} />
      )}
      {values.selectedTabIndex === 2 && <InfluenceGraph data={values.data} />}
      {values.selectedTabIndex === 3 && <ActivityGraph data={values.data} />}
    </div>
  );
}

const rootElement = document.getElementById('root');
ReactDOM.render(<App />, rootElement);
