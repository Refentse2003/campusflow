import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const CreateTutors = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const { toast } = useToast();

  const createTutorAccounts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-tutor-accounts');
      
      if (error) throw error;

      setResults(data.results);
      
      const successCount = data.results.filter((r: any) => r.success).length;
      toast({
        title: "Tutor Accounts Created",
        description: `Successfully created ${successCount} tutor account(s)`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-8">
      <Card>
        <CardHeader>
          <CardTitle>Create Tutor Accounts</CardTitle>
          <CardDescription>
            Generate accounts for: Refentse Atlegang Mokoena, Wanda Giqo, and Silindokuhle Ngqokoma
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={createTutorAccounts} 
            disabled={loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Tutor Accounts
          </Button>

          {results && (
            <div className="space-y-2 mt-4">
              <h3 className="font-semibold">Results:</h3>
              {results.map((result: any, index: number) => (
                <div 
                  key={index} 
                  className={`p-3 rounded-lg ${
                    result.success 
                      ? 'bg-green-50 border border-green-200' 
                      : 'bg-red-50 border border-red-200'
                  }`}
                >
                  <p className="font-medium">{result.email}</p>
                  {result.success && (
                    <>
                      <p className="text-sm text-muted-foreground">
                        ✓ Tutor account configured successfully
                      </p>
                      {result.was_existing && (
                        <p className="text-sm text-blue-600">
                          (User already existed - updated tutor settings)
                        </p>
                      )}
                      <p className="text-sm font-medium mt-1">
                        Password: {result.temporary_password}
                      </p>
                    </>
                  )}
                  {result.error && (
                    <p className="text-sm text-red-600">{result.error}</p>
                  )}
                  {result.role_error && (
                    <p className="text-sm text-yellow-600">
                      User created but role error: {result.role_error}
                    </p>
                  )}
                  {result.tutor_error && (
                    <p className="text-sm text-yellow-600">
                      Tutor entry error: {result.tutor_error}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateTutors;
