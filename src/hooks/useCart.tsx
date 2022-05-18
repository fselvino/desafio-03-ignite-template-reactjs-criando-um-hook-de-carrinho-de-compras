
import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
/**
 * Verifica se exite algum registro com o valor @RocketShoes:Cart e retorna 
 * esse valor caso existir.Caso contraio, retornar um arry vazio
 */
     const storagedCart = localStorage.getItem('@RocketShoes:cart')

     if (storagedCart) {
       return JSON.parse(storagedCart);
     }

    return [];
  });


  const prevCartRef = useRef<Product[]>()

  useEffect(()=>{
    prevCartRef.current = cart
  })

  const cartPreviousValue = prevCartRef.current ?? cart

  useEffect(()=> {
    if(cartPreviousValue !== cart){
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart))
    }
  }, [cart, cartPreviousValue])



  const addProduct = async (productId: number) => {

    const updatedCart = [...cart]    

    try {   
      
      //verificar se existe o produto no carrinho
      const productsExists = updatedCart.find(product => product.id === productId)     

       //levanta o stoque de produto requisitado na base de dados 
      const stock = await api.get(`/stock/${productId}`)

      //Pega a quantidade de estoque diponivel 
      const stockAmount = stock.data.amount

      //levanta a quantidade de item no carrinho, se existir pega a quantidade senão e zero
      const currentAmount = productsExists ? productsExists.amount: 0

      //incrementa a quantidade desejada com a quantidade ja existente no carrinho
      const amount = currentAmount +1

      //testa se a quantidade desejada e maior que o estoque retorna erro
      if(amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque')
        return
      }

      //Caso o produto já exita no carrinho, não se deve adicionar o novo produto, apenas repita e incrementar em um.
      if(productsExists){
          productsExists.amount = amount

      //se não existir o produto no carrinho ele adiciona um novo produto.
      }else {

      //cria um novo produto e a quantidade inicia com um
        const product = await api.get(`/products/${productId}`)
        const newProduct = {
          ...product.data,
          amount: 1
        }
        //atualiza atualiza updatedCart com o novo produto
        updatedCart.push(newProduct)
      }
      //persiste os dados no estado cart
      setCart(updatedCart)
      
      //captura erro caso exista e retorna mensagem ao usuario 
    } catch {
      toast.error('Erro na adição do produto')
    }
  };

  const removeProduct = (productId: number) => {
    try {

      //garante a imutabilidade
      const updatedCart = [...cart]
      //verifica se o produto existe em cart e retorna o INDEX
      const productIndex = updatedCart.findIndex(product => product.id ===productId)

      //se o index for maior que zero e porque o pruduto exite no carrinho
      if(productIndex >= 0){
        updatedCart.splice(productIndex, 1) //remove o produto do carrinho de index retornado na posiçao 1.
        setCart(updatedCart)     //atualiza o estado cart

      }else{
        throw Error()//se não existir o produto no carrinho retorna erro.
      }
    } catch {
      toast.error('Erro na remoção do produto')
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {

      //se for nemor ou igual a zero sai da função
      if(amount <= 0 ){          
        return
      }

      //verifica o estoque da base de dados
      const stock = await api.get(`/stock/${productId}`)

       //apura o estoque atual na base 
      const stockAmount = stock.data.amount

       //verifica se existe esto suficiente para saida ou entrada 
      if(amount > stockAmount){
        toast.error('Quantidade solicitada fora de estoque')
        return
      }

      //garante a imutabilidade
      const updateCart = [...cart]
      //veja se o produto existe no carrinho
      const productExist = updateCart.find(product => product.id === productId)

      //se existir o produto atualizar a quantidade recebida da funçao
      if(productExist) {
        productExist.amount = amount
        setCart(updateCart)
       
      }else{
        throw Error()
      }

    } catch {
      toast.error('Erro na alteração de quantidade do produto')
    }
  };

  //retorna o carrinho, e as funçoes de adção, remoção e atualização de produtos no carrinho.
  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
