import React, { Component } from 'react';
import './App.css';
import styled from 'styled-components'

import moment from "moment"
import SunCalc from "suncalc"
import { minBy, uniq } from "lodash"
import * as cache from "./cache"

const StyledComponentWrap = styled.div`
  display: grid;
  grid-template-rows: 32% 68%;
  height: 100vh
  color: #eee;
  background: rgb(26, 30, 33);
  & #number {
    font-size: 10rem;
    display: flex
    align-items: flex-end;
    justify-content: center;
  }

  & #details {
    padding: 10px;
    display: grid;
    grid-template-columns: max-content auto;
    grid-auto-rows: max-content;
    grid-gap: 10px
  }
`;

class App extends Component {

  constructor(){
    super()
    cache.initializeCache()
    this.state = {}
  }

  componentDidMount = () => {
    navigator.geolocation.getCurrentPosition(position => {
      this.setState({position})
    })

    setInterval(() => {
      this.setState({
        currentTime: moment()
      })
    }, 1000)
  }

  getNewMoonDate = (startDate, coordinates, isPrevious) => {
    const calculationDate = moment(startDate)
    const solarDays = []
    for (let i = 0; i < 60 * 24 * 30; i++) {
      const moonIllumination = SunCalc.getMoonIllumination(calculationDate)
      solarDays.push({
        date: calculationDate.format(),
        illuminationFraction: moonIllumination.fraction,
      })
      isPrevious ? calculationDate.subtract(1, "m") : calculationDate.add(1, "m")
    }
    const solarDayWithNewMoon = minBy(solarDays, (i) => i.illuminationFraction)
    const moonTimesAtNewMoonDay = SunCalc.getMoonTimes(moment(solarDayWithNewMoon.date), coordinates.lat, coordinates.lon)
    return {...solarDayWithNewMoon, rise: moment(moonTimesAtNewMoonDay.rise).format(), set: moment(moonTimesAtNewMoonDay.set).format()}
  }

  getMoonRisesBetween = (prevNewMoon, nextNewMoon, coordinates) => {
    const moonRises = [];
    let moonMonthStart = moment(prevNewMoon.date)
    let moonMonthEnd = moment(nextNewMoon.date)
    moonRises.push(moonMonthStart.format())
    let calculationTime = moment(moonMonthStart)
    do {
      calculationTime.add(1, 'h')
      const moonTimes = SunCalc.getMoonTimes(calculationTime, coordinates.lat, coordinates.lon)
      let moonRiseMoment = moment(moonTimes.rise)
      if (moonRiseMoment.isBetween(moonMonthStart, moonMonthEnd)) {
        moonRises.push(moonRiseMoment.format())
      }
      //if (calculationTime.isAfter(moment("2018-06-03"))) debugger
    } while (calculationTime.isBefore(moonMonthEnd))
    moonRises.push(moonMonthEnd.format())
    return uniq(moonRises);
  }

  convertMoonRisesToDays = moonRises => {
    const moonDays = []
    for (let i=0; i < moonRises.length - 1; i++) {
      moonDays.push({
        dayNumber: i + 1,
        dayStart: moonRises[i],
        dayEnd: moonRises[i+1]
      })
    }
    return moonDays
  }

  calculateMoonDayFor = (date, coordinates) => {
    const calculationCacheKey = `${date.format("YYYY-MM-DDTHH:mm")}_${JSON.stringify(coordinates)}`
    const cachedCalculation = cache.getCachedCalculation(calculationCacheKey)
    if (cachedCalculation) return cachedCalculation

    console.log('requested date and position not found in cahce. calculating...')
    const prevNewMoon = this.getNewMoonDate(date, coordinates, true)
    const nextNewMoon = this.getNewMoonDate(date, coordinates)
    const moonRisesAtSoughtMonth = this.getMoonRisesBetween(prevNewMoon, nextNewMoon, coordinates)
    const moonDays = this.convertMoonRisesToDays(moonRisesAtSoughtMonth)
    console.log(moonDays)
    const soughtMoonDay = moonDays.find(d => date.isBetween(d.dayStart, d.dayEnd))
    cache.cacheCalculationResult(calculationCacheKey, soughtMoonDay)

    return soughtMoonDay
  }

  render() {
    const { position: { coords: {latitude:lat = 49.9935, longitude:lon = 36.2304 } = {} } = {} } = this.state
    const currentMoonDay = this.calculateMoonDayFor(moment(), {lat, lon})
    return (
      <StyledComponentWrap>
        <div id="number">{currentMoonDay.dayNumber}</div>
        <div id="details">
          <div>Moon Day Start:</div> <div>{moment(currentMoonDay.dayStart).format('ddd D MMM HH:mm:ss')}</div>
          <div>Moon Day End:</div> <div>{moment(currentMoonDay.dayEnd).format('ddd D MMM HH:mm:ss')}</div>
        </div>
      </StyledComponentWrap>
    );
  }
}

export default App;
