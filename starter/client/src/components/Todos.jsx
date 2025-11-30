import update from 'immutability-helper';
import React, { useEffect, useState } from 'react';
import {
  Button, Checkbox, Divider, Grid, Header, Icon, Image, Loader,
} from 'semantic-ui-react';
import { useNavigate } from 'react-router-dom';
import { useApiToken } from '../auth/token';

const API = process.env.REACT_APP_API_ENDPOINT;

export default function Todos() {
  const [todos, setTodos] = useState([]);
  const [loadingTodos, setLoadingTodos] = useState(true);
  const getToken = useApiToken();
  const navigate = useNavigate();

  const loadTodos = async () => {
    setLoadingTodos(true);
    const token = await getToken();
    const res = await fetch(`${API}/todos`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setTodos(data.items ?? []);
    setLoadingTodos(false);
  };

  useEffect(() => {
    loadTodos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleTodo = async (pos) => {
    const todo = todos[pos];
    const token = await getToken();
    await fetch(`${API}/todos/${todo.todoId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ done: !todo.done }),
    });
    setTodos(update(todos, { [pos]: { done: { $set: !todo.done } } }));
  };

  const deleteTodo = async (todoId) => {
    const token = await getToken();
    await fetch(`${API}/todos/${todoId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    setTodos(todos.filter((t) => t.todoId !== todoId));
  };

  const getUploadUrl = async (todoId) => {
    const token = await getToken();
    const res = await fetch(`${API}/todos/${todoId}/attachment`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const { uploadUrl } = await res.json();
    return uploadUrl;
  };

  const handleFileChange = async (e, todoId) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const uploadUrl = await getUploadUrl(todoId);
    await fetch(uploadUrl, { method: 'PUT', body: file });
    await loadTodos();
  };

  if (loadingTodos) {
    return <Loader indeterminate active>Loading TODOs</Loader>;
  }

  return (
    <Grid padded>
      <Grid.Row>
        <Grid.Column width={16}>
          <Header as="h1">TODOs</Header>
          <Button primary onClick={() => navigate('/create')}>
            <Icon name="add" /> New task
          </Button>
        </Grid.Column>
      </Grid.Row>
      <Divider />
      {todos.map((todo, pos) => (
        <Grid.Row key={todo.todoId} columns={3} verticalAlign="middle">
          <Grid.Column width={1}>
            <Checkbox
              onChange={() => toggleTodo(pos)}
              checked={todo.done}
            />
          </Grid.Column>
          <Grid.Column width={10}>
            <Header as="h3">{todo.name}</Header>
            <p>Due: {todo.dueDate}</p>
            {todo.attachmentUrl && (
              <Image src={todo.attachmentUrl} size="small" bordered />
            )}
          </Grid.Column>
          <Grid.Column width={5} textAlign="right">
            <label className="ui icon button">
              <Icon name="upload" />
              <input type="file" hidden onChange={(e) => handleFileChange(e, todo.todoId)} />
            </label>
            <Button color="red" onClick={() => deleteTodo(todo.todoId)}>
              <Icon name="trash" /> Delete
            </Button>
          </Grid.Column>
        </Grid.Row>
      ))}
    </Grid>
  );
}
