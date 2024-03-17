import { createProcess } from "@/lib/ao";
import { useActiveAddress } from "@arweave-wallet-kit-beta/react";
import { Button, Form, type FormProps, Input, message, Alert } from "antd";
import { useState } from "react";
import { Link } from "react-router-dom";

type FieldType = { name?: string };

export default function Create() {
  const address = useActiveAddress();
  const [messageApi, contextHolder] = message.useMessage();
  const [isLoading, setIsLoading] = useState(false);
  const [game, setGame] = useState({ Id: "", Name: "", Owner: "" });

  const onFinish: FormProps<FieldType>["onFinish"] = async (values) => {
    setIsLoading(true);
    const name = values.name as string;
    try {
      const processId = await createProcess(name, address as string);
      setGame({ Id: processId, Name: name, Owner: address as string });
      messageApi.success("Game created successfully!");
    } catch (err) {
      console.log(err);
      messageApi.error(
        (err as { message?: string })?.message ?? "Failed to create game!"
      );
    }
    setIsLoading(false);
  };

  return (
    <div className="flex w-full mx-auto items-center justify-center mt-4">
      {contextHolder}
      <Form
        className="flex-grow"
        name="basic"
        style={{ maxWidth: 600 }}
        initialValues={{ remember: true }}
        onFinish={onFinish}
        autoComplete="off"
      >
        <Form.Item<FieldType>
          label="Name"
          name="name"
          rules={[{ required: true, message: "Please input name!" }]}
        >
          <Input />
        </Form.Item>

        <Form.Item className="flex items-center justify-center">
          <Button type="primary" htmlType="submit" loading={isLoading}>
            {isLoading ? "Creating..." : "Create"}
          </Button>
        </Form.Item>

        {game.Name && (
          <Alert
            message={game.Name}
            type="success"
            showIcon
            action={<Link to={`/game/${game.Id}`}>Play</Link>}
            closable
          />
        )}
      </Form>
    </div>
  );
}
