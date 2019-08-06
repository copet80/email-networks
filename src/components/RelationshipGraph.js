import React from 'react';
import * as d3 from 'd3';

export default class RelationshipGraph extends React.Component {
  static defaultProps = {
    width: 960,
    height: 550,
    isEmailLabelVisible: true,
  };

  state = {
    processedData: [],
    emailsMap: {},
  };

  constructor(props) {
    super(props);

    this.rootRef = React.createRef();
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
    const { width, height } = this.props;
    const { processedData } = this.state;
    const links = processedData.links.map((d) => Object.create(d));
    const nodes = processedData.nodes.map((d) => Object.create(d));

    const scale = d3.scaleOrdinal(d3.schemeCategory10);
    const color = (d) => scale(d.group);

    const drag = (simulation) => {
      function dragstarted(d) {
        if (!d3.event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      }

      function dragged(d) {
        d.fx = d3.event.x;
        d.fy = d3.event.y;
      }

      function dragended(d) {
        if (!d3.event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      }

      return d3
        .drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended);
    };

    const simulation = d3
      .forceSimulation(nodes)
      .force(
        'link',
        d3
          .forceLink(links)
          .distance(40)
          .id((d) => d.id),
      )
      .force('charge', d3.forceManyBody())
      .force('center', d3.forceCenter(width / 2, height / 2));

    d3.select(this.rootRef.current)
      .selectAll('svg')
      .remove();

    const svg = d3
      .select(this.rootRef.current)
      .append('svg')
      .attr('viewBox', [0, 0, width, height]);

    const link = svg
      .append('g')
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.6)
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke-width', (d) => Math.sqrt(d.value));

    const node = svg
      .append('g')
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5)
      .selectAll('circle')
      .data(nodes)
      .join('circle')
      .attr('r', 5)
      .attr('fill', color)
      .call(drag(simulation));

    node.append('title').text((d) => d.id);

    simulation.on('tick', () => {
      link
        .attr('x1', (d) => d.source.x)
        .attr('y1', (d) => d.source.y)
        .attr('x2', (d) => d.target.x)
        .attr('y2', (d) => d.target.y);

      node.attr('cx', (d) => d.x).attr('cy', (d) => d.y);
    });
  }

  extractNodes = (data) => {};

  extractLinks = (data) => {
    const emails = {};
    data.forEach((item) => {
      const { referrer, referral1, referral2 } = item;
      const referrerLC = referrer.toLowerCase();
      const referral1LC = referral1.toLowerCase();
      const referral2LC = referral2.toLowerCase();
      emails[referrerLC] = { id: referrerLC, email: referrer, group: 1 };
      emails[referral1LC] = { id: referral1LC, email: referral1, group: 1 };
      emails[referral2LC] = { id: referral2LC, email: referral2, group: 1 };
    });
    return [];
  };

  addRelationship(array, node1Label, node2Label, weight = 0, degree = 0) {
    if (!node1Label || !node2Label) {
      return;
    }
    let node1LabelLC = node1Label.toLowerCase();
    let node2LabelLC = node2Label.toLowerCase();
    if (node1LabelLC > node2LabelLC) {
      const temp = node1Label;
      node1Label = node2Label;
      node2Label = temp;
      node1LabelLC = node1Label.toLowerCase();
      node2LabelLC = node2Label.toLowerCase();
    }

    array.push({
      key: `${node1LabelLC}~${node2LabelLC}`,
      node1: {
        key: node1LabelLC,
        label: node1Label,
      },
      node2: {
        key: node2LabelLC,
        label: node2Label,
      },
      weight,
      degree,
    });
  }

  extractRelationships(
    item,
    firstDegreeWeight = 5,
    secondDegreeWeight = 2,
    includesOnlyFirstDegree = true,
  ) {
    const relationships = [];
    this.addRelationship(
      relationships,
      item.referrer,
      item.referral1,
      firstDegreeWeight,
      1,
    );
    this.addRelationship(
      relationships,
      item.referrer,
      item.referral2,
      firstDegreeWeight,
      1,
    );

    if (!includesOnlyFirstDegree) {
      this.addRelationship(
        relationships,
        item.referral1,
        item.referral2,
        secondDegreeWeight,
        2,
      );
    }
    return relationships;
  }

  processData = async (data) => {
    return new Promise((resolve) => {
      const emailsMap = {};
      const links = [];
      const linksMap = {};

      data.forEach((item) => {
        const { referrer, referral1, referral2 } = item;
        const referrerLC = referrer.toLowerCase();
        const referral1LC = referral1.toLowerCase();
        const referral2LC = referral2.toLowerCase();
        emailsMap[referrerLC] = {
          id: referrerLC,
          email: referrer,
          group: 1,
        };
        emailsMap[referral1LC] = {
          id: referral1LC,
          email: referral1,
          group: 1,
        };
        emailsMap[referral2LC] = {
          id: referral2LC,
          email: referral2,
          group: 1,
        };

        const relationships = this.extractRelationships(item);
        relationships.forEach((relationship) => {
          if (!linksMap[relationship.key]) {
            linksMap[relationship.key] = {
              sourceNode: relationship.node1,
              targetNode: relationship.node2,
              source: relationship.node1.key,
              target: relationship.node2.key,
              value: 0,
            };
            links.push(linksMap[relationship.key]);
          }
          linksMap[relationship.key].value += relationship.weight;
        });
      });

      const nodes = Object.keys(emailsMap).map((key) => emailsMap[key]);
      const processedData = {
        nodes,
        links,
      };
      this.setState(
        {
          processedData,
          emailsMap,
        },
        resolve,
      );
    });
  };

  render() {
    return <div ref={this.rootRef} className="relationship-graph" />;
  }
}
