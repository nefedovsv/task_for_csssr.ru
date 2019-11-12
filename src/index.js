import React from "react";
import { render } from "react-dom";

const createStore = (reducer, initialState) => {
  let currentState = initialState;
  const listeners = [];

  const getState = () => currentState;
  const dispatch = action => {
    currentState = reducer(currentState, action);
    listeners.forEach(listener => listener());
  };

  const subscribe = listener => {
    listeners.push(listener);

    // добовляем отписку
    return () => listeners.splice(listeners.indexOf(listener), 1);
  };

  return { getState, dispatch, subscribe };
};

const StoreContext = React.createContext();

const connect = (mapStateToProps, mapDispatchToProps) => Component => {
  class WrappedComponent extends React.Component {
    // избавился от legacy кода, добавил контекст через static
    static contextType = StoreContext;

    render() {
      return (
        <Component
          {...this.props}
          {...mapStateToProps(this.context.getState(), this.props)}
          {...mapDispatchToProps(this.context.dispatch, this.props)}
        />
      );
    }

    // заменил на componentDidMount
    componentDidMount() {
      this.unsubscribe = this.context.subscribe(this.handleChange);
    }
    // сделал отписку
    componentWillUnmount() {
      this.unsubscribe();
    }

    handleChange = () => {
      this.forceUpdate();
    };
  }
  return WrappedComponent;
};

//Переписал функцию Provider
class Provider extends React.Component {
  render() {
    return (
      <StoreContext.Provider value={this.props.store}>
        {this.props.children}
      </StoreContext.Provider>
    );
  }
}

// APP

// actions
const CHANGE_INTERVAL = "CHANGE_INTERVAL";

// action creators
const changeInterval = value => ({
  type: CHANGE_INTERVAL,
  payload: value
});

// reducers
const reducer = (state = initialInterval, action) => {
  switch (action.type) {
    case CHANGE_INTERVAL:
      return state + action.payload ? (state += action.payload) : state; // сделал запрет на введение отрицательного интервала
    default:
      return state; // должен вернуть state
  }
};

// components

class IntervalComponent extends React.Component {
  render() {
    return (
      <div>
        <span>
          Интервал обновления секундомера: {this.props.currentInterval} сек.
        </span>
        <span>
          <button onClick={() => this.props.changeInterval(-1)}>-</button>
          <button onClick={() => this.props.changeInterval(1)}>+</button>
        </span>
      </div>
    );
  }
}

const Interval = connect(
  // перепутан  state и dispatch
  state => ({
    currentInterval: state
  }),
  dispatch => ({
    changeInterval: value => dispatch(changeInterval(value))
  })
)(IntervalComponent);

class TimerComponent extends React.Component {
  // добавил интервал
  state = {
    currentTime: 0,
    interval: null
  };

  componentDidUpdate(prevProps, prevState) {
    if (
      prevProps.currentInterval !== this.props.currentInterval &&
      prevState.interval !== null
    ) {
      this.handleStart();
    }
  }
  // добавил в метод componentWillUnmount удаление интервала
  componentWillUnmount() {
    clearInterval(this.state.currentInterval);
  }
  // погасил кнопку "Старт" и "Стоп" во время работы.
  render() {
    return (
      <div>
        <Interval />
        <div>Секундомер: {this.state.currentTime} сек.</div>
        <div>
          <button onClick={this.handleStart} disabled={this.state.interval > 0}>
            Старт
          </button>

          <button
            onClick={this.handleStop}
            disabled={this.state.interval === null}
          >
            Стоп
          </button>
        </div>
      </div>
    );
  }
  // вынес в отдельный метод
  updatetime = () =>
    this.setState((state, props) => ({
      //сгруппировал несколько вызовов setState() в одно обновление для улучшения производительности.
      currentTime: state.currentTime + props.currentInterval
    }));

  // переписал через стрелочную функцию
  handleStart = () => {
    clearInterval(this.state.interval);
    this.setState({
      interval: setInterval(
        this.updatetime,
        this.props.currentInterval * 1000 // таймер в мсек
      )
    });
  };
  // переписал через стрелочную функцию
  handleStop = () => {
    clearInterval(this.state.interval);
    this.setState({
      currentTime: 0,
      interval: null
    });
  };
}

const Timer = connect(
  state => ({
    currentInterval: state
  }),
  () => {}
)(TimerComponent);

const initialInterval = 1; // добавил аргумент initialInterval в createStore.

// init
render(
  <Provider store={createStore(reducer, initialInterval)}>
    <Timer />
  </Provider>,
  document.getElementById("root")
);
