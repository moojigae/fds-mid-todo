import "@babel/polyfill"; // 이 라인을 지우지 말아주세요!
import axios from 'axios'

const api = axios.create({
  baseURL: 'https://near-grey.glitch.me/'
})

api.interceptors.request.use(function (config) {
  // localStorage에 token이 있으면 요청에 헤더 설정,
  // 없으면 아무것도 하지 않음
  const token = localStorage.getItem('token')
  if (token) {
    config.headers = config.headers || {}
    config.headers['Authorization'] = 'Bearer ' + token
  }
  return config
});

const templates = {
  loginForm: document.querySelector('#login-form').content,
  todoList: document.querySelector('#todo-list').content,
  todoItem: document.querySelector('#todo-item').content
}

const rootEl = document.querySelector('.root')

function drawLoginForm() {
  // 1. 템플릿 복사하기
  const fragment = document.importNode(templates.loginForm, true)
  // 2. 내용 채우고, 이벤트 리스너 등록하기
  const loginFormEl = fragment.querySelector('.login-form')

  loginFormEl.addEventListener('submit', async e => {
    e.preventDefault()
    // e 이벤트 객체
    // e.target 은 이벤트를 실제로 일으킨 요소 객체 (여기서는 loginFormEl)
    // e.target.elements: 폼 내부에 들어있는 요소 객체를 편하게 가져올 수 있는 특이한 객체
    // e.target.elements.username name 어트리뷰트에 username이라고 지정되어 있는 input 객체
    // .value 사용자가 input 태그에 입력한 값
    const username = e.target.elements.username.value
    const password = e.target.elements.password.value
    const res = await api.post('/users/login', {
      username, // === username : username
      password
    })
    localStorage.setItem('token', res.data.token)
    drawTodoList()
    // 임시 테스트 코드
    // const res2 = await api.get('/todos')
    // 토큰이 api에 저장되어야 함
    // alert(JSON.stringify(res2.data))
  })
  // 3. 문서 내부에 삽입하기
  rootEl.textContent = ''
  rootEl.appendChild(fragment)
}

async function drawTodoList(){
  const res = await api.get('/todos')
  const list = res.data
  // 1. 템플릿 복사하기
  const fragment = document.importNode(templates.todoList, true)

  // 2. 내용 채우고 이벤트 리스너 등록하기
  const todoListEl = fragment.querySelector('.todo-list')
  const todoFormEl = fragment.querySelector('.todo-form')
  const logoutEl = fragment.querySelector('.logout')

  logoutEl.addEventListener('click', e => {
    // 비동기 작업 할 예정이 없음(서버에 요청 안보냄)
    // 로그아웃 절차
    // 1. 토큰 삭제
    localStorage.removeItem('token')
    // 2. 로그인 폼 보여주기
    drawLoginForm()
  })

  todoFormEl.addEventListener('submit', async e => {
    document.body.classList.add('loading')
    // 바디 클래스에 로딩 붙이기
    e.preventDefault()
    const body = e.target.elements.body.value
    const res = await api.post('/todos', {
      body,
      complete : false
    })
    // if (res.status === 201){
    // axios는 성공하지 않으면 에러메세지를 띄움
    // }
    // drawTodoList 함수의 실행이 끝날 때까지 기다림
    // promise에는 undefined가 채워짐
    await drawTodoList()
    // 비동기 함수(함수의 작업이 끝날 때까지 기다리는 것이 아니고 기다리지 않고 넘어감)
    // 비동기 함수이기 때문에 이 작업이 완료 되기 전에  loading indicator가 먼저 실행 됨
    // await를 붙이지 않으면 loading 화면이 사라지고 조금 후에 목록이 추가됨
    // 비동기 함수를 호출했을 때 반환되는 프라미스에는 비동기 함수 내부에서 반환하는 값이 채워짐
    document.body.classList.remove('loading')
  })

  list.forEach(todoItem => {
    // 1. 템플릿 복사하기
    const fragment = document.importNode(templates.todoItem, true)

    // 2. 내용 채우고 이벤트 리스너 등록하기
    const bodyEl = fragment.querySelector('.body')
    const deleteEl = fragment.querySelector('.delete')
    const completeEl = fragment.querySelector('.complete')

    if (todoItem.complete){
      completeEl.setAttribute('checked', '')
      // complete: true가 되어 있으면 checked 붙여서 화면에 체크 표시 되게
      // 이름만 있고 값이 없는 것을 불리연 어트리뷰트라 부름
    }

    deleteEl.addEventListener('click', async e => {
      // 삭제 요청 보내고 해당 경로를 만들어서 경로에 맞는 데이터를 삭제
      await api.delete('todos/' + todoItem.id)
      // 성공 시 할 일 목록 다시 그리기
      drawTodoList()
    })

    bodyEl.textContent = todoItem.body

    completeEl.addEventListener('click', async e =>{
      // e.preventDefault()
      // 체크를 눌러도 체크표시 안되게
      // 주석을 풀면 비관적 업데이트로 변함
      // 1. 사용자 입력 -> 수정 요청 -> 성공 시 화면 갱신 : 비관적 업데이트(pessmistic)
      // 2. 사용자 입력 -> 회면 갱신 -> 수정 요청 : 낙관적 업데이트(optimistic)
      // 낙관적업데이트는 수정 요청이 실패했을 때 원상태로 구현하기 힘들다
      // 비관적업데이트는 loading indicator(로딩중 표시)를 사용해야함

      await api.patch('todos/' + todoItem.id, {
        complete: !todoItem.complete
        // 본래 값에서 반대로(true면 fasle)
      })
      drawTodoList()
    })

    // 3. 문서 내부에 삽입하기
    todoListEl.appendChild(fragment)
  })

  // 3. 문서 내부에 삽입하기
  rootEl.textContent = ''
  // 할 일 목록 추가 후 칸 비워주기
  rootEl.appendChild(fragment)
}

// 만약 로그인을 한 상태라면 바로 할 일 목록을 보여주고
if (localStorage.getItem('token')){
  // localstorage에서 없는 값을 넣으면 null이 반환되기 때문에 turthy로 가능
  drawTodoList()
} else {
  drawLoginForm()
  // 아니라면 로그인 폼을 보여준다.
}

// drawLoginForm()
// 스크립트가 로딩되면 로그인 폼이 바로 그려지게 함
