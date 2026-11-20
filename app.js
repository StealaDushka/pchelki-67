// Публичный ключ Supabase: его можно держать в коде сайта, данные защищены правилами (RLS) в базе.
const SUPABASE_URL = "https://tkyamcshnblsxbqyvqba.supabase.co";
const SUPABASE_KEY = "sb_publishable_k9B2AicjW42dXvndeJ9GJA_bOKcKT4j";

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const $ = (s) => document.querySelector(s);

function show(name) {
  document.querySelectorAll(".screen").forEach((el) => el.classList.remove("active"));
  $("#screen-" + name).classList.add("active");
}
function say(el, text, kind = "") {
  el.textContent = text;
  el.className = "msg " + kind;
}

const ERRORS = {
  "Invalid login credentials": "Неверная почта или пароль",
  "User already registered": "Такая почта уже зарегистрирована",
  "Email not confirmed": "Подтверди почту: мы отправили письмо",
};
const ru = (msg) => ERRORS[msg] || msg;

// ---------- вкладки ----------
document.querySelectorAll(".tab").forEach((tab) =>
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t === tab));
    document.querySelectorAll(".form").forEach((f) => f.classList.remove("active"));
    $("#form-" + tab.dataset.tab).classList.add("active");
    say($("#auth-msg"), "");
  })
);

// ---------- регистрация ----------
$("#form-register").addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = new FormData(e.target);
  const nickname = f.get("nickname").trim();
  const msg = $("#auth-msg");
  const btn = e.target.querySelector("button");
  btn.disabled = true;
  say(msg, "Создаём пчёлку…");

  const { data: taken } = await sb.from("profiles").select("id").ilike("nickname", nickname).maybeSingle();
  if (taken) {
    btn.disabled = false;
    return say(msg, "Этот ник уже занят", "error");
  }

  const { data, error } = await sb.auth.signUp({
    email: f.get("email").trim(),
    password: f.get("password"),
    options: {
      data: { nickname },
      emailRedirectTo: location.origin + location.pathname,
    },
  });
  btn.disabled = false;
  if (error) return say(msg, ru(error.message), "error");
  if (!data.session) {
    say(msg, "Почти готово! Открой письмо на почте и подтверди её 📩", "ok");
  }
});

// ---------- вход ----------
$("#form-login").addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = new FormData(e.target);
  const msg = $("#auth-msg");
  const btn = e.target.querySelector("button");
  btn.disabled = true;
  say(msg, "Летим…");
  const { error } = await sb.auth.signInWithPassword({
    email: f.get("email").trim(),
    password: f.get("password"),
  });
  btn.disabled = false;
  if (error) say(msg, ru(error.message), "error");
});

// ---------- вопрос ----------
let profile = null;

async function answer(respects) {
  const { error } = await sb.from("profiles").update({ respects_bees: respects }).eq("id", profile.id);
  if (error) return say($("#question-msg"), "Не получилось сохранить, попробуй ещё раз", "error");
  profile.respects_bees = respects;
  renderHome();
}
$("#btn-yes").addEventListener("click", () => answer(true));

// Кнопка «Нет» убегает. На пятый раз сдаётся.
let dodges = 0;
const noBtn = $("#btn-no");
function dodge() {
  if (dodges >= 5) return;
  dodges++;
  const x = (Math.random() - 0.5) * 160;
  const y = (Math.random() - 0.5) * 80;
  noBtn.style.transform = `translate(${x}px, ${y}px)`;
  const lines = ["Ты уверен?", "Пчёлки обидятся…", "Подумай ещё", "Ну пожалуйста 🥺", "Ладно, жми…"];
  say($("#question-msg"), lines[dodges - 1]);
}
noBtn.addEventListener("pointerenter", dodge);
noBtn.addEventListener("click", (e) => {
  if (dodges < 5) { e.preventDefault(); return dodge(); }
  answer(false);
});

// ---------- улей ----------
function renderHome() {
  $("#home-nick").textContent = profile.nickname;
  $("#home-honey").textContent = profile.honey;
  $("#home-wins").textContent = profile.wins;
  $("#home-respect").textContent = profile.respects_bees
    ? "Ты уважаешь пчёлок. Пчёлки уважают тебя 🐝"
    : "Ты не уважаешь пчёлок. Они это запомнили 😠";
  show("home");
}

$("#btn-logout").addEventListener("click", () => sb.auth.signOut());

async function loadProfile(user) {
  const { data, error } = await sb.from("profiles").select("*").eq("id", user.id).single();
  if (error) {
    show("auth");
    return say($("#auth-msg"), "Не удалось загрузить профиль", "error");
  }
  profile = data;
  if (profile.respects_bees === null) {
    dodges = 0;
    noBtn.style.transform = "";
    say($("#question-msg"), "");
    show("question");
  } else {
    renderHome();
  }
}

sb.auth.onAuthStateChange((_event, session) => {
  // отложено, чтобы не вызывать Supabase внутри обработчика
  setTimeout(() => {
    if (session?.user) loadProfile(session.user);
    else { profile = null; show("auth"); }
  }, 0);
});
