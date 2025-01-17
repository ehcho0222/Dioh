import { useEffect, useState } from "react";
import { Button, Link, Table, Input, Grid } from "@nextui-org/react";
import MyHead from "../../components/head";
import { RealtimeClient } from "@supabase/realtime-js";
import { SourceCode } from "@prisma/client";
import DTT from "../../util/dateToTime";
import { uid } from "uid";
import realtimeMSG from "../../types/realtimeMSG";
import { useRouter } from "next/router";
import Load from "../../components/Loading";
import axios from "axios";
import { toast } from "react-toastify";

const langName: { [key: string]: string } = {
  cpp: "C++",
  js: "JavaScript",
  py: "Python",
};

export default function SubmitStatus() {
  let [submits, setSubmits] = useState<SourceCode[]>([]);
  let [submits2, setSubmits2] = useState<SourceCode[]>([]);
  let [temp__________, temp__________s] = useState("");
  let [loading, load] = useState(false);
  let [cursor, setCursor] = useState("");
  let [input_1, setI1] = useState("");
  let [input_2, setI2] = useState("");
  let router = useRouter();
  let query = router.query;

  const forceRefresh = () => {
    temp__________s(uid());
  };

  useEffect(() => {
    let subs: SourceCode[] = submits;
    let nameDB: { [key: string]: string } = {};
    const socket = new RealtimeClient(
      process.env.NEXT_PUBLIC_REALTIME_URL || "ws://localhost:4000/socket",
      {
        params: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON as string,
        },
      }
    );
    socket.connect();

    var channel = socket.channel("realtime:public:*", {
      user_token: process.env.NEXT_PUBLIC_SUPABASE_ANON as string,
    });
    // DB에 추가
    channel.on("INSERT", (msg: realtimeMSG) => {
      // msg.record = SourceCode

      if (query.problem) {
        if (msg.record.problem != query.problem) {
          return;
        }
      }
      if (query.user) {
        if (msg.record.user != query.user) {
          return;
        }
      }

      let userID = msg.record.user;

      if (nameDB[userID]) {
        msg.record.user = nameDB[userID];
      } else {
        axios.get(`/api/user/get/token/${userID}`).then((v) => {
          let step_a = subs.find((c) => c.id == msg.record.id) as SourceCode;
          let step_b = subs.indexOf(step_a);

          msg.record.user = JSON.stringify({
            name: v.data.nickName,
            color: v.data.nameColor,
          });
          nameDB[userID] = JSON.stringify({
            name: v.data.nickName,
            color: v.data.nameColor,
          });
          subs[step_b].user = msg.record.user;
          setSubmits(subs);
        });
        msg.record.user = JSON.stringify({
          name: "Loading...",
          color: userID,
        });
      }

      subs = [msg.record].concat(subs);
      setSubmits(subs);
    });
    // DB 업데이트
    channel.on("UPDATE", (msg: realtimeMSG) => {
      // msg.record = SourceCode
      // msg.old_record = {
      //  id: "ID",
      // }
      try {
        let step_a = subs.find((c) => c.id == msg.old_record?.id) as SourceCode;
        let step_b = subs.indexOf(step_a);
        subs[step_b].score = msg.record.score;
        setSubmits(subs);
      } catch (e) {
        toast(`ERR / ${e}`, {
          type: "error",
        });
      }
    });
    channel.subscribe().receive("ok", () => {});

    // Set the JWT so Realtime can verify and keep the channel alive
    socket.setAuth(process.env.NEXT_PUBLIC_SUPABASE_ANON as string);

    let inter = setInterval(() => {
      forceRefresh();
    }, 1000);

    setI1((query.problem as string) || "");
    setI2(((query.user as string) || "").replace(".-.", "#"));

    load(true);
    if (cursor == "" && submits.length > 0) {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      cursor = submits[submits.length - 1].id;
    }
    axios
      .get(
        `/api/submitstatus/get?cursor=${cursor}&problem=${query.problem}&user=${query.user}`
      )
      .then((v) => {
        if (v.data.length == 0) {
          return;
        }
        if (v.data.err) {
          return;
        }
        setCursor(v.data[v.data.length - 1].id);
        setSubmits2(submits2.concat(v.data));
      })
      .catch((err) => {
        toast(`Err / ${err}`, {
          type: "error",
        });
      })
      .finally(() => {
        load(false);
      });

    return () => {
      clearInterval(inter);
    };
  }, [query.problem, query.user, submits]);

  return (
    <>
      {loading ? <Load /> : null}
      <div
        style={{
          display: "none",
        }}
      >
        {temp__________}
      </div>
      <MyHead />
      <article className="container">
        <Grid.Container
          style={{
            marginBottom: "10px",
          }}
        >
          <Grid xs={4}>
            <Input
              labelPlaceholder="문제 번호"
              value={input_1}
              fullWidth
              onChange={(e) => {
                setI1(e.target.value);
              }}
            />
          </Grid>
          <Grid xs={4}>
            <Input
              labelPlaceholder="유저 이름"
              value={input_2}
              fullWidth
              onChange={(e) => {
                setI2(e.target.value);
              }}
            />
          </Grid>
          <Grid>
            <Button
              auto
              onClick={() => {
                router
                  .push(
                    `/submitstatus?problem=${input_1}&user=${input_2.replace(
                      "#",
                      ".-."
                    )}`
                  )
                  .then(() => {
                    router.reload();
                  });
              }}
            >
              검색
            </Button>
          </Grid>
        </Grid.Container>
        <Table>
          <Table.Header>
            <Table.Column>제출 번호</Table.Column>
            <Table.Column>문제 번호</Table.Column>
            <Table.Column>유저 이름</Table.Column>
            <Table.Column>점수</Table.Column>
            <Table.Column>제출 언어</Table.Column>
            <Table.Column>제출 시각</Table.Column>
          </Table.Header>
          <Table.Body>
            {submits.concat(submits2).map((v, idx) => {
              return (
                <Table.Row key={idx}>
                  <Table.Cell>{v.id}</Table.Cell>
                  <Table.Cell>
                    <Link href={`/problem/${v.problem}`}>{v.problem}</Link>
                  </Table.Cell>
                  <Table.Cell>
                    <Link
                      href={`/user/${JSON.parse(v.user).name.split("#")[0]}/${
                        JSON.parse(v.user).name.split("#")[1]
                      }`}
                    >
                      <div
                        style={{
                          color: JSON.parse(v.user).color,
                        }}
                      >
                        {JSON.parse(v.user).name}
                      </div>
                    </Link>
                  </Table.Cell>
                  <Table.Cell>{v.score}</Table.Cell>
                  <Table.Cell>
                    {(langName[v.type as string] as string) ||
                      (v.type as string)}
                  </Table.Cell>
                  <Table.Cell>{DTT(new Date(v.time))}</Table.Cell>
                </Table.Row>
              );
            })}
          </Table.Body>
        </Table>
        <Button
          auto
          css={{
            marginTop: "10px",
            float: "right",
          }}
          onClick={() => {
            load(true);
            if (cursor == "" && submits.length > 0) {
              cursor = submits[submits.length - 1].id;
            }
            axios
              .get(
                `/api/submitstatus/get?cursor=${cursor}&problem=${
                  query.problem
                }&user=${(query.user as string) || ""}`
              )
              .then((v) => {
                if (v.data.length == 0) {
                  toast("No more data to load", {
                    type: "warning",
                  });
                  return;
                }
                if (v.data.err) {
                  toast(`ERR / ${v.data.err}`, {
                    type: "error",
                  });
                  return;
                }
                setCursor(v.data[v.data.length - 1].id);
                setSubmits2(submits2.concat(v.data));
              })
              .catch((err) => {
                toast(`Err / ${err}`, {
                  type: "error",
                });
              })
              .finally(() => {
                load(false);
              });
          }}
          aria-label={`Load more cursor : ${cursor}`}
        >
          더 불러오기
        </Button>
      </article>
    </>
  );
}
