import React, { Component } from "react";
import * as d3 from "d3";

class InteractiveStreamGraph extends Component {
    componentDidUpdate(){
    const chartData = this.props.csvData;
    console.log("Rendering chart with data:", chartData);
    // Don't render if data is empty
    if (!chartData || chartData.length === 0) {
        return;
    }
    
    // Define the LLM model names to visualize
    const llmModels = ["GPT-4", "Gemini", "PaLM-2", "Claude", "LLaMA-3.1"];

    const colors = {
      "GPT-4": "#e41a1c",
      Gemini: "#377eb8",
      "PaLM-2": "#4daf4a",
      Claude: "#984ea3",
      "LLaMA-3.1": "#ff7f00",
    };

    const svg = d3.select(".svg_parent");
    svg.selectAll("*").remove();

    const svgWidth = 600;
    const svgHeight = 500;

    svg.attr("width", svgWidth).attr("height", svgHeight);

    const margin = { top: 100, right: 180, bottom: 40, left: 50 };
    const width = svgWidth - margin.left - margin.right;
    const height = svgHeight - margin.top - margin.bottom;

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const parseFormats = [
      d3.timeParse("%Y-%m-%d"),
      d3.timeParse("%Y-%m"),
      d3.timeParse("%b %Y"),
      d3.timeParse("%B %Y"),
    ];

    const parseDate = (value) => {
      if (value instanceof Date) return value;
      for (const f of parseFormats) {
        const d = f(value);
        if (d) return d;
      }
      return null;
    };

    const data = chartData
      .map((d) => {
        const date = parseDate(d.Date || d.date);
        if (!date) return null;

        const row = { date };
        llmModels.forEach((key) => {
          const v = +d[key];
          row[key] = isNaN(v) ? 0 : v;
        });
        return row;
      })
      .filter((d) => d !== null)
      .sort((a, b) => a.date - b.date);

    if (!data.length) return;

    const stack = d3.stack().keys(llmModels).offset(d3.stackOffsetWiggle).order(d3.stackOrderNone);
    const series = stack(data);

    const x = d3.scaleTime().domain(d3.extent(data, (d) => d.date)).range([0, width]);

    const yExtent = [
      d3.min(series, (layer) => d3.min(layer, (d) => d[0])),
      d3.max(series, (layer) => d3.max(layer, (d) => d[1])),
    ];

    let yMin = yExtent[0];
    let yMax = yExtent[1];
    if (yMax === undefined || yMin === undefined) {
      yMin = 0;
      yMax = 0;
    }
    const yRange = yMax - yMin || 1;
    const yPadding = yRange * 0.05;
    const y = d3.scaleLinear().domain([yMin - yPadding, yMax + yPadding]).range([height, 0]);

    const area = d3.area().x((d) => x(d.data.date)).y0((d) => y(d[0])).y1((d) => y(d[1])).curve(d3.curveCatmullRom);

    const xAxis = d3.axisBottom(x).ticks(d3.timeMonth.every(1)).tickFormat(d3.timeFormat("%b"));
    g.append("g").attr("class", "x-axis").attr("transform", `translate(0,${height})`).call(xAxis);

    let tooltip = d3.select("#stream-tooltip");
    if (tooltip.empty()) {
      tooltip = d3.select("body").append("div").attr("id", "stream-tooltip").style("position", "absolute")
        .style("pointer-events", "none").style("background", "white")
        .style("border", "1px solid #ccc").style("border-radius", "4px")
        .style("box-shadow", "0 2px 8px rgba(0,0,0,0.15)").style("padding", "8px").style("opacity", 0);
    }

    const showTooltip = (event, modelKey) => {
      tooltip.style("opacity", 1);

      const miniWidth = 220;
      const miniHeight = 160;
      const mMargin = { top: 20, right: 10, bottom: 40, left: 40 };
      const iw = miniWidth - mMargin.left - mMargin.right;
      const ih = miniHeight - mMargin.top - mMargin.bottom;

      const formatMonth = d3.timeFormat("%b %y");
      const modelData = data.map((d) => ({
        date: d.date,
        formatted: formatMonth(d.date),
        value: d[modelKey],
      }));

      const xMini = d3.scaleBand().domain(modelData.map((d) => d.formatted)).range([0, iw]).padding(0.1);
      const yMini = d3.scaleLinear().domain([0, d3.max(modelData, (d) => d.value) || 0]).nice().range([ih, 0]);

      tooltip.html("");
      tooltip.append("div").style("font-weight", "bold").style("margin-bottom", "4px").text(modelKey);

      const miniSvg = tooltip.append("svg").attr("width", miniWidth).attr("height", miniHeight);

      const mg = miniSvg.append("g").attr("transform", `translate(${mMargin.left},${mMargin.top})`);

      mg.selectAll("rect").data(modelData).enter().append("rect").attr("x", (d) => xMini(d.formatted))
        .attr("y", (d) => yMini(d.value)).attr("width", xMini.bandwidth()).attr("height", (d) => ih - yMini(d.value))
        .attr("fill", colors[modelKey]);

      const xTicks = xMini.domain().filter((_, i) => {
        const step = Math.max(1, Math.floor(modelData.length / 4));
        return i % step === 0;
      });

      mg.append("g").attr("transform", `translate(0,${ih})`).call(d3.axisBottom(xMini).tickValues(xTicks))
        .selectAll("text").style("font-size", "9px").attr("transform", "rotate(-40)").style("text-anchor", "end");

      mg.append("g").call(d3.axisLeft(yMini).ticks(4).tickSizeOuter(0)).selectAll("text").style("font-size", "9px");

      const [mouseX, mouseY] = [event.pageX, event.pageY];
      tooltip.style("left", `${mouseX + 15}px`).style("top", `${mouseY - 10}px`);
    };

    const moveTooltip = (event) => {
      tooltip.style("left", `${event.pageX + 15}px`).style("top", `${event.pageY - 10}px`);
    };

    const hideTooltip = () => {
      tooltip.style("opacity", 0);
    };

    const layerGroup = g.append("g").attr("class", "layers");

    series.forEach((layer) => {
      const modelKey = layer.key;

      layerGroup.append("path").datum(layer).attr("class", "stream-layer").attr("fill", colors[modelKey])
        .attr("stroke", "none").attr("opacity", 0.9).attr("d", area)
        .on("mouseover", (event) => {
          d3.select(event.currentTarget).attr("opacity", 1);
          showTooltip(event, modelKey);
        })
        .on("mousemove", (event) => {
          moveTooltip(event);
        })
        .on("mouseout", (event) => {
          d3.select(event.currentTarget).attr("opacity", 0.9);
          hideTooltip();
        });
    });

    const legend = svg.append("g").attr("class", "legend").attr("transform",`translate(${margin.left + width + 15}, ${margin.top})`);

    llmModels.forEach((key, i) => {
      const row = legend.append("g").attr("transform", `translate(0, ${i * 22})`);
      row.append("rect").attr("width", 14).attr("height", 14).attr("fill", colors[key]);
      row.append("text").attr("x", 20).attr("y", 11).attr("dy", "0").style("font-size", "12px").text(key);
    });

    svg.append("text").attr("x", margin.left + width / 2).attr("y", svgHeight - 5).attr("text-anchor", "middle").style("font-size", "12px").text("Time (Month / Year)");
  }

  render() {
    return (
      <svg
        style={{ width: 600, height: 500 }}
        className="svg_parent"
      ></svg>
    );
  }
}

export default InteractiveStreamGraph;
