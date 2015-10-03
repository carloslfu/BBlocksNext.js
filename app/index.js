/** @jsx hJSX */
import Cycle, {Rx} from '@cycle/core';
import {hJSX, makeDOMDriver} from '@cycle/dom';


function main({DOM}) {
  return {
    DOM: Rx.Observable.just(
        <section>
          <workspace width={500} height={500} >
            <workspace width={100} height={100} >
            
            </workspace>
          </workspace>
        </section>
      )
  }
}

Cycle.run(main, {
  DOM: makeDOMDriver('#app', {
    'workspace': require('./components/workspace'),
  }),
})
