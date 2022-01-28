import React, { useState, useEffect } from 'react';
import './App.css';
import { API, Storage } from 'aws-amplify';

import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';

import { listTodos } from './graphql/queries';
import {
	createTodo as createTodoMutation,
	deleteTodo as deleteTodoMutation,
} from './graphql/mutations';

const initialFormState = { name: '', description: '' };

function App() {
	const [Todos, setTodos] = useState([]);
	const [formData, setFormData] = useState(initialFormState);

	useEffect(() => {
		fetchTodos();
	}, []);

	async function fetchTodos() {
		const apiData = await API.graphql({ query: listTodos });
		const TodosFromAPI = apiData.data.listTodos.items;
		await Promise.all(
			TodosFromAPI.map(async (Todo) => {
				if (Todo.image) {
					const image = await Storage.get(Todo.image);
					Todo.image = image;
				}
				return Todo;
			})
		);
		setTodos(apiData.data.listTodos.items);
	}

	async function onChange(e) {
		if (!e.target.files[0]) return;
		const file = e.target.files[0];
		setFormData({ ...formData, image: file.name });
		await Storage.put(file.name, file);
		fetchTodos();
	}

	async function createTodo() {
		if (!formData.name || !formData.description) return;
		await API.graphql({
			query: createTodoMutation,
			variables: { input: formData },
		});
		if (formData.image) {
			const image = await Storage.get(formData.image);
			formData.image = image;
		}
		setTodos([...Todos, formData]);
		setFormData(initialFormState);
	}

	async function deleteTodo({ id }) {
		const newTodosArray = Todos.filter((Todo) => Todo.id !== id);
		setTodos(newTodosArray);
		await API.graphql({
			query: deleteTodoMutation,
			variables: { input: { id } },
		});
	}

	return (
		<Authenticator>
			{({ signOut, user }) => (
				<div className="App">
					<h1>My Todos App</h1>
					<input
						onChange={(e) => setFormData({ ...formData, name: e.target.value })}
						placeholder="Todo name"
						value={formData.name}
					/>
					<input
						onChange={(e) =>
							setFormData({ ...formData, description: e.target.value })
						}
						placeholder="Todo description"
						value={formData.description}
					/>
					<input type="file" onChange={onChange} />
					<button onClick={createTodo}>Create Todo</button>
					<div style={{ marginBottom: 30 }}>
						{Todos.map((todo) => (
							<div key={todo.id || todo.name}>
								<h2>{todo.name}</h2>
								<p>{todo.description}</p>
								<button onClick={() => deleteTodo(todo)}>Delete todo</button>
								{todo.image && <img src={todo.image} style={{ width: 400 }} />}
							</div>
						))}
					</div>
				</div>
			)}
		</Authenticator>
	);
}

export default App;
