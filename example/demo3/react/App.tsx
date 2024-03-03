import { random } from 'lodash-es'

export const App = () => {
  console.log(random(0, 10))

  return (
    <div>
      <h1>我是凤雏 react!</h1>
    </div>
  )
}
