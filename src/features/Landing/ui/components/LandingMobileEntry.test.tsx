// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {cleanup,fireEvent,render,screen} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";
import {afterEach,expect,it,vi} from "vitest";
import LandingMobileEntry from "./LandingMobileEntry";

const props = () => ({onGoogleLogin:vi.fn(),onEmailLogin:vi.fn(async()=>({ok:true})),onEmailRegister:vi.fn(async()=>({ok:true})),onPasswordResetRequest:vi.fn(async()=>true),onResendVerification:vi.fn(async()=>true),authLoading:false});
afterEach(cleanup);
it("progressively opens email entry and preserves the draft when returning to choices",()=>{
  const callbacks=props();
  render(<MemoryRouter><LandingMobileEntry {...callbacks}/></MemoryRouter>);
  expect(screen.getByLabelText("Email")).not.toBeVisible();
  fireEvent.click(screen.getByRole("button",{name:"使用 Google 登入"}));
  expect(callbacks.onGoogleLogin).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByRole("button",{name:"使用 Email 登入或註冊"}));
  expect(screen.getByLabelText("Email")).toBeVisible();
  fireEvent.change(screen.getByLabelText("Email"),{target:{value:"player@example.test"}});
  fireEvent.click(screen.getByRole("button",{name:"其他登入方式"}));
  fireEvent.click(screen.getByRole("button",{name:"使用 Email 登入或註冊"}));
  expect(screen.getByLabelText("Email")).toHaveValue("player@example.test");
  fireEvent.click(screen.getByRole("button",{name:"註冊"}));
  expect(screen.getByLabelText("密碼")).toHaveAttribute("autocomplete","new-password");
});
it("gives signed-in players a main play destination and a secondary creation destination",()=>{
  render(<MemoryRouter><LandingMobileEntry {...props()} authUser={{id:"demo",display_name:"猜歌玩家"}}/></MemoryRouter>);
  expect(screen.getByRole("link",{name:"開始玩"})).toHaveAttribute("href","/rooms");
  expect(screen.getByRole("link",{name:"建立題庫"})).toHaveAttribute("href","/collections/new");
  expect(screen.queryByLabelText("Email")).not.toBeInTheDocument();
});
