import { Transaction } from '@mysten/sui/transactions';
import { Button, Card, Flex, TextField } from '@radix-ui/themes';
import { useSignAndExecuteTransaction, useSuiClient, useCurrentAccount } from '@mysten/dapp-kit';
import { useState } from 'react';
import { useNetworkVariable } from '../networkConfig';
import { useNavigate } from 'react-router-dom';

export function CreateAllowlist() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const account = useCurrentAccount();
  const packageId = useNetworkVariable('packageId');
  const suiClient = useSuiClient();
  
  const { mutate: signAndExecute } = useSignAndExecuteTransaction({
    execute: async ({ bytes, signature }) =>
      await suiClient.executeTransactionBlock({
        transactionBlock: bytes,
        signature,
        options: {
          showRawEffects: true,
          showEffects: true,
        },
      }),
  });

  function createAllowlist(name: string) {
    if (!name.trim()) {
      alert('Please enter a name for the allowlist');
      return;
    }
    
    if (!account?.address) {
      alert('Please connect your wallet first');
      return;
    }
    
    const tx = new Transaction();
    
    // First, create the allowlist and get the capability
    const [cap] = tx.moveCall({
      target: `${packageId}::allowlist::create_allowlist`,
      arguments: [
        tx.pure.string(name.trim()),
      ],
    });
    
    // Then add the creator to their own allowlist
    tx.moveCall({
      target: `${packageId}::allowlist::add`,
      arguments: [
        tx.object(cap), // The capability returned from create_allowlist
        tx.pure.address(account.address), // Creator's address
      ],
    });
    
    // Transfer the capability to the creator
    tx.transferObjects([cap], account.address);
    
    tx.setGasBudget(10000000);
    
    signAndExecute(
      {
        transaction: tx,
      },
      {
        onSuccess: async (result) => {
          console.log('Allowlist created successfully', result);
          
          // Find the created allowlist object (the one that's shared)
          const allowlistObject = result.effects?.created?.find(
            (item) => item.owner && typeof item.owner === 'object' && 'Shared' in item.owner,
          );
          
          const createdObjectId = allowlistObject?.reference?.objectId;
          if (createdObjectId) {
            window.open(
              `${window.location.origin}/allowlist-example/admin/allowlist/${createdObjectId}`,
              '_blank',
            );
          }
        },
        onError: (error) => {
          console.error('Error creating allowlist:', error);
          alert('Failed to create allowlist. See console for details.');
        },
      },
    );
  }

  const handleViewAll = () => {
    navigate(`/allowlist-example/admin/allowlists`);
  };

  return (
    <Card>
      <h2 style={{ marginBottom: '1rem' }}>Admin View: Create Allowlist</h2>
      <Flex direction="column" gap="3">
        <TextField.Root>
          <TextField.Input 
            placeholder="Allowlist Name" 
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </TextField.Root>
        <Flex gap="2">
          <Button
            onClick={() => createAllowlist(name)}
            disabled={!name.trim()}
          >
            Create Allowlist
          </Button>
          <Button variant="soft" onClick={handleViewAll}>
            View All Allowlists
          </Button>
        </Flex>
      </Flex>
    </Card>
  );
}
