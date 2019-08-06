import React from 'react';
import * as d3 from 'd3';
import seedrandom from 'seedrandom';

const linkDegreeColor = ['#000', '#999', '#999', '#aaa'];
const nodeReferrerColor = '#0a0';

function random(seedKey, seedIndex) {
  return seedrandom(`${seedKey}_${seedIndex}`)();
}

function randRange(min, max, seedIndex = 0, seedKey = 'abc') {
  return min + random(seedKey, seedIndex) * (max - min);
}

export default class DegreeGraph extends React.Component {
  static defaultProps = {
    width: 960,
    height: 550,
    zoneRadius: 100,
    zoneWidth: 100,
    isEmailLabelVisible: true,
  };

  state = {
    processedData: [],
    emails: [],
    emailsMap: {},
  };

  constructor(props) {
    super(props);

    this.canvasRef = React.createRef();
  }

  async componentDidMount() {
    await this.processData(this.props.data);
    this.constructGraph();
  }

  async componentDidUpdate(prevProps) {
    if (
      JSON.stringify(this.props.data || {}) !==
      JSON.stringify(prevProps.data || {})
    ) {
      await this.processData(this.props.data);
      this.constructGraph();
    }
  }

  constructGraph() {
    const { zoneRadius, zoneWidth } = this.props;
    const { processedData, emailsMap } = this.state;
    const nodes = [];
    const nodesById = {};

    processedData.forEach((emails, degree) => {
      emails.forEach((email) => {
        let node;
        if (!nodesById[email]) {
          node = {
            id: email,
            degree,
            email: {
              key: email,
              label: emailsMap[email],
            },
            count: 0,
          };
          nodes.push(node);
          nodesById[email] = node;
        } else {
          node = nodesById[email];
          node.count++;
        }
      });
    });

    const links = [];
    const rootNode = nodes[0];
    processedData.forEach((emails, degree) => {
      if (degree > 0) {
        emails.forEach((email) => {
          links.push({
            source: rootNode.id,
            target: email,
            degree,
          });
        });
      }
    });

    const simulation = d3
      .forceSimulation(nodes)
      .force('charge', d3.forceManyBody().strength(-5))
      .force(
        'link',
        d3
          .forceLink(links)
          .id((d) => d.id)
          .strength(0.15)
          .distance((d, index) => {
            return randRange(
              d.degree * zoneRadius + zoneWidth * 0.2,
              d.degree * zoneRadius + zoneWidth * 0.8,
              index,
            );
          }),
      )
      .on('tick', this.handleSimulationTick);

    const canvas = this.canvasRef.current;
    const context = canvas.getContext('2d');

    d3.select(canvas).call(
      d3
        .drag()
        .container(canvas)
        .subject(this.getDragSubject)
        .on('start', this.handleDragStart)
        .on('drag', this.handleDrag)
        .on('end', this.handleDragEnd),
    );

    this.nodes = nodes;
    this.links = links;
    this.simulation = simulation;
    this.canvas = canvas;
    this.context = context;

    this.handleSimulationTick();
  }

  addRelationships = (
    email,
    data,
    emailsMap,
    processedData,
    referrerDegree,
    referralDegree,
  ) => {
    const emailLC = email.toLowerCase();

    data.forEach((item) => {
      const { referrer, referral1, referral2 } = item;
      const referrerLC = referrer.toLowerCase();
      if (!emailsMap[referrerLC]) {
        emailsMap[referrerLC] = referrer;
      }
      const referral1LC = referral1.toLowerCase();
      if (!emailsMap[referral1LC]) {
        emailsMap[referral1LC] = referral1;
      }
      const referral2LC = referral2.toLowerCase();
      if (!emailsMap[referral2LC]) {
        emailsMap[referral2LC] = referral2;
      }
      if (referrerLC === emailLC) {
        if (!processedData[referrerDegree].includes(referrerLC)) {
          processedData[referrerDegree].push(referrerLC);
        }
        if (!processedData[referralDegree].includes(referral1LC)) {
          processedData[referralDegree].push(referral1LC);
        }
        if (!processedData[referralDegree].includes(referral2LC)) {
          processedData[referralDegree].push(referral2LC);
        }
      }
    });
  };

  processData = async (data) => {
    return new Promise((resolve) => {
      const processedData = [[], [], []];
      const emailsMap = {};
      const { email } = this.props;
      this.addRelationships(email, data, emailsMap, processedData, 0, 1);
      processedData[1].forEach((referralEmail) => {
        this.addRelationships(
          referralEmail,
          data,
          emailsMap,
          processedData,
          1,
          2,
        );
      });

      const emails = Object.keys(emailsMap).map((key) => emailsMap[key]);
      this.setState({ emails, emailsMap, processedData }, resolve);
    });
  };

  drawLink = (d) => {
    const { context } = this;
    context.beginPath();
    context.lineWidth = 3 - d.degree;
    context.strokeStyle = linkDegreeColor[d.degree];
    context.setLineDash(d.degree > 1 ? [5, 5] : []);
    context.moveTo(d.source.x, d.source.y);
    context.lineTo(d.target.x, d.target.y);
    //context.stroke();
  };

  drawNode = (d, index) => {
    const { context } = this;
    context.moveTo(d.x + 3, d.y);
    context.beginPath();
    context.arc(d.x, d.y, 13 + d.count * 2, 0, 2 * Math.PI);
    context.fillStyle = '#fff';
    context.fill();
    context.strokeStyle = index === 0 ? nodeReferrerColor : '#666';
    context.setLineDash([]);
    context.stroke();
    context.moveTo(d.x + 3, d.y);
    context.font = '12px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = index === 0 ? nodeReferrerColor : '#333';
    context.fillText(index, d.x, d.y);

    // email label
    const { isEmailLabelVisible } = this.props;
    if (isEmailLabelVisible) {
      context.font = '11px Arial';
      context.fillText(d.email.label, d.x, d.y - 20);
    }
  };

  drawZones = () => {
    const { zoneRadius, zoneWidth } = this.props;
    const { context, nodes } = this;
    const x = nodes[0].x;
    const y = nodes[0].y;
    context.moveTo(x, y);

    context.beginPath();
    context.arc(x, y, zoneRadius * 2 + zoneWidth, 0, 2 * Math.PI);
    context.fillStyle = '#ccf';
    context.fill();

    context.beginPath();
    context.arc(x, y, zoneRadius + zoneWidth, 0, 2 * Math.PI);
    context.fillStyle = '#cfc';
    context.fill();

    context.beginPath();
    context.arc(x, y, zoneRadius, 0, 2 * Math.PI);
    context.fillStyle = '#fff';
    context.fill();
  };

  handleSimulationTick = () => {
    const { context, nodes, links, drawNode, drawLink, drawZones } = this;
    const { width, height } = this.props;

    context.clearRect(0, 0, width, height);
    context.save();
    context.translate(width / 2, height / 2);

    drawZones();

    links.forEach(drawLink);

    nodes.forEach(drawNode);

    context.restore();
  };

  getDragSubject = () => {
    const { width, height } = this.props;
    return this.simulation.find(
      d3.event.x - width / 2,
      d3.event.y - height / 2,
    );
  };

  handleDragStart = () => {
    if (!d3.event.active) this.simulation.alphaTarget(0.3).restart();
    d3.event.subject.fx = d3.event.subject.x;
    d3.event.subject.fy = d3.event.subject.y;
  };

  handleDrag = () => {
    d3.event.subject.fx = d3.event.x;
    d3.event.subject.fy = d3.event.y;
  };

  handleDragEnd = () => {
    if (!d3.event.active) this.simulation.alphaTarget(0);
    d3.event.subject.fx = null;
    d3.event.subject.fy = null;
  };

  render() {
    const { width, height } = this.props;

    return (
      <div className="relationship-graph">
        <canvas ref={this.canvasRef} width={width} height={height} />
      </div>
    );
  }
}
