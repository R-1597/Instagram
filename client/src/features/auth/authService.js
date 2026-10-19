
// import api from "@/lib/api";

// export async function registerUser(formData) {
//   const response = await api.post("/auth/register", formData);
//   return response.data;
// }

// export async function loginUser(credentials) {
//   const response = await api.post("/auth/login", credentials);
//   return response.data;
// }


import api from "@/lib/api";

export async function registerUser(formData) {
  const payload = {
    username: formData.username.trim().toLowerCase(),
    email: formData.email.trim().toLowerCase(),
    password: formData.password,
    ...(formData.displayName?.trim()
      ? { displayName: formData.displayName.trim() }
      : {}),
  };

  const response = await api.post("/auth/register", payload);
  return response.data;
}

export async function loginUser(credentials) {
  const response = await api.post("/auth/login", {
    email: credentials.email.trim().toLowerCase(),
    password: credentials.password,
  });

  return response.data;
}
