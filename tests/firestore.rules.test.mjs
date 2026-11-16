// Tests des règles Firestore — lancés dans l'émulateur via `npm run test:rules`.
import { before, after, beforeEach, describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { initializeTestEnvironment, assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs, query, where, serverTimestamp } from "firebase/firestore";

let env;
const ITEMS = "private/demo/items";
const staff = (uid, provider = "google.com") =>
  env.authenticatedContext(uid, { email: `${uid}@ketos.test`, firebase: { sign_in_provider: provider } }).firestore();
const item = (ownerId, extra = {}) => ({ title: "Titre", ownerId, createdAt: serverTimestamp(), ...extra });

before(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-ketos",
    firestore: { rules: readFileSync(new URL("../firestore.rules", import.meta.url), "utf8") },
  });
});
after(() => env.cleanup());
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async ctx => {
    const db = ctx.firestore();
    await setDoc(doc(db, "admins/alice"), { role: "admin" });
    await setDoc(doc(db, "admins/bob"), { role: "admin" });
    await setDoc(doc(db, "admins/anon"), { role: "admin" });
    await setDoc(doc(db, `${ITEMS}/a1`), { title: "A", ownerId: "alice", createdAt: new Date() });
    await setDoc(doc(db, "public/p1"), { name: "public" });
  });
});

describe("admins", () => {
  it("un utilisateur lit son propre statut", () => assertSucceeds(getDoc(doc(staff("alice"), "admins/alice"))));
  it("un utilisateur non membre peut vérifier son statut (document absent)", () => assertSucceeds(getDoc(doc(staff("eve"), "admins/eve"))));
  it("personne ne lit le statut d'un autre", () => assertFails(getDoc(doc(staff("eve"), "admins/alice"))));
  it("personne ne s'ajoute soi-même à l'équipe", () => assertFails(setDoc(doc(staff("eve"), "admins/eve"), { role: "admin" })));
  it("personne ne liste l'équipe", () => assertFails(getDocs(collection(staff("alice"), "admins"))));
});

describe("items privés", () => {
  it("un membre crée un item valide", () => assertSucceeds(setDoc(doc(staff("alice"), `${ITEMS}/x`), item("alice"))));
  it("un membre lit ses items", () =>
    assertSucceeds(getDocs(query(collection(staff("alice"), ITEMS), where("ownerId", "==", "alice")))));
  it("un membre modifie le titre de son item", () => assertSucceeds(updateDoc(doc(staff("alice"), `${ITEMS}/a1`), { title: "B" })));
  it("un membre supprime son item", () => assertSucceeds(deleteDoc(doc(staff("alice"), `${ITEMS}/a1`))));

  it("un non-membre ne crée rien", () => assertFails(setDoc(doc(staff("eve"), `${ITEMS}/x`), item("eve"))));
  it("un compte anonyme est refusé même listé", () =>
    assertFails(setDoc(doc(staff("anon", "anonymous"), `${ITEMS}/x`), item("anon"))));
  it("un visiteur non connecté est refusé", () =>
    assertFails(getDocs(query(collection(env.unauthenticatedContext().firestore(), ITEMS), where("ownerId", "==", "alice")))));
  it("un membre ne lit pas les items d'un autre", () =>
    assertFails(getDocs(query(collection(staff("bob"), ITEMS), where("ownerId", "==", "alice")))));
  it("un membre ne crée pas pour un autre", () => assertFails(setDoc(doc(staff("bob"), `${ITEMS}/x`), item("alice"))));
  it("ownerId n'est pas modifiable", () => assertFails(updateDoc(doc(staff("alice"), `${ITEMS}/a1`), { ownerId: "bob" })));
  it("titre vide refusé", () => assertFails(setDoc(doc(staff("alice"), `${ITEMS}/x`), item("alice", { title: "" }))));
  it("titre > 200 caractères refusé", () =>
    assertFails(setDoc(doc(staff("alice"), `${ITEMS}/x`), item("alice", { title: "x".repeat(201) }))));
  it("champ inconnu refusé", () => assertFails(setDoc(doc(staff("alice"), `${ITEMS}/x`), item("alice", { admin: true }))));
  it("date de création falsifiée refusée", () =>
    assertFails(setDoc(doc(staff("alice"), `${ITEMS}/x`), item("alice", { createdAt: new Date(0) }))));
});

describe("public", () => {
  it("lecture ouverte", () => assertSucceeds(getDoc(doc(env.unauthenticatedContext().firestore(), "public/p1"))));
  it("écriture interdite", () => assertFails(setDoc(doc(staff("alice"), "public/p2"), { x: 1 })));
});
