import React from 'react';
import WordCloud from 'react-d3-cloud';

const fontSizeMapper = (word) => word.value;

export default class InfluenceGraph extends React.Component {
  render() {
    const dataMap = [];
    this.props.data.forEach((item) => {
      const { referrer, referral1, referral2 } = item;
      if (!dataMap[referrer]) dataMap[referrer] = { text: referrer, value: 0 };
      if (!dataMap[referral1])
        dataMap[referral1] = { text: referral1, value: 0 };
      if (!dataMap[referral2])
        dataMap[referral2] = { text: referral2, value: 0 };
      dataMap[referrer].value += 10;
      dataMap[referral1].value += 2;
      dataMap[referral2].value += 2;
    });
    const data = Object.keys(dataMap).map((key) => dataMap[key]);
    return <WordCloud data={data} fontSizeMapper={fontSizeMapper} />;
  }
}
